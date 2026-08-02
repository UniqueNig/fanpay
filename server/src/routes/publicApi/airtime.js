import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireApiKey, perKeyLimiter, logApiRequest } from "../../middleware/requireApiKey.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { resolveProviderId, maskawasubBuyAirtime } from "../../services/maskawasub.js";
import { getAirtimeRate } from "../../services/maskawasubPricing.js";
import { getSettings, assertNotMaintenance, assertServiceEnabled } from "../../services/settings.js";
import { requireApiKeyAndBalance, debitThenPurchaseApi } from "../../services/apiPurchase.js";
import { sandboxBuyAirtime } from "../../services/sandboxProvider.js";
import { Transaction } from "../../models/Transaction.js";

const router = Router();

function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return false;
  }
  return true;
}

router.post(
  "/airtime",
  requireApiKey,
  perKeyLimiter,
  logApiRequest,
  [
    body("network").isString().trim().notEmpty(),
    body("phone").isString().trim().isLength({ min: 10, max: 11 }),
    body("amount").isFloat({ gt: 0 }),
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, amount } = req.body;
      const networkKey = network.toLowerCase();
      const networkId = await resolveProviderId("network", networkKey);
      if (!networkId) throw new ApiError(400, `Unknown network: ${network}`);

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "airtime");

      // Always the apiPrice tier here — requireApiKey already guarantees a
      // "live" request only ever reaches this point for an approved
      // developer, and sandbox requests use it too so a developer sees the
      // same numbers testing as they will in production.
      const rate = await getAirtimeRate(networkKey);
      const buyingPrice = amount * (rate.buyingPrice / 100);
      const chargeAmount = amount * ((rate.apiPrice ?? rate.buyingPrice) / 100);

      await requireApiKeyAndBalance(req.apiKey, req.developer, chargeAmount);

      const requestId = Date.now().toString();
      const ref = "AIR-" + requestId;
      const title = `${network.toUpperCase()} Airtime – ${phone} (API)`;

      const result = await debitThenPurchaseApi({
        apiKey: req.apiKey,
        developer: req.developer,
        amount: chargeAmount,
        reference: ref,
        title,
        category: "📱",
        meta: { network, phone, amount, buyingPrice, sellingPrice: chargeAmount, source: "developer_api", apiKeyId: req.apiKey._id },
        purchase: () =>
          req.apiKey.environment === "sandbox"
            ? sandboxBuyAirtime({ network: networkId, mobile_number: phone, amount })
            : maskawasubBuyAirtime({ network: networkId, mobile_number: phone, amount }),
      });

      await Transaction.updateOne(
        { reference: ref },
        { $set: { "meta.providerId": result?.id, "meta.deliveryStatus": result?.Status, "meta.apiResponse": result?.api_response } }
      );

      res.json({ success: true, status: result?.Status, requestId, reference: ref, amountCharged: chargeAmount });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
