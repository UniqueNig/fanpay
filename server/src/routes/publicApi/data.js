import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireApiKey, perKeyLimiter } from "../../middleware/requireApiKey.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { resolveProviderId, maskawasubBuyData } from "../../services/maskawasub.js";
import { resolveDataPlanPrice } from "../../services/maskawasubPricing.js";
import { getSettings, assertNotMaintenance, assertServiceEnabled } from "../../services/settings.js";
import { requireApiKeyAndBalance, debitThenPurchaseApi } from "../../services/apiPurchase.js";
import { sandboxBuyData } from "../../services/sandboxProvider.js";
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
  "/data",
  requireApiKey,
  perKeyLimiter,
  [
    body("network").isString().trim().notEmpty(),
    body("phone").isString().trim().isLength({ min: 10, max: 11 }),
    body("variationCode").isString().trim().notEmpty(),
  ],
  async (req, res, next) => {
    if (!checkValidation(req, res)) return;
    try {
      const { network, phone, variationCode } = req.body;
      const networkKey = network.toLowerCase();
      const networkId = await resolveProviderId("network", networkKey);
      if (!networkId) throw new ApiError(400, `Unknown network: ${network}`);

      const planId = Number(variationCode);
      if (!Number.isInteger(planId)) throw new ApiError(400, "Invalid plan selected.");

      const settings = await getSettings();
      assertNotMaintenance(settings);
      assertServiceEnabled(settings, "data");

      // Same authoritative, server-resolved pricing the consumer app uses
      // (routes/vtu.js) — never trusts a client-supplied amount.
      const priced = await resolveDataPlanPrice(networkKey, planId);
      const chargeAmount = priced.sellingPrice;

      await requireApiKeyAndBalance(req.apiKey, req.developer, chargeAmount);

      const requestId = Date.now().toString();
      const ref = "DATA-" + requestId;
      const title = `${network.toUpperCase()} Data – ${phone} (API)`;

      const result = await debitThenPurchaseApi({
        apiKey: req.apiKey,
        developer: req.developer,
        amount: chargeAmount,
        reference: ref,
        title,
        category: "📶",
        meta: {
          network, phone, variationCode, buyingPrice: priced.buyingPrice, sellingPrice: priced.sellingPrice,
          source: "developer_api", apiKeyId: req.apiKey._id,
        },
        purchase: () =>
          req.apiKey.environment === "sandbox"
            ? sandboxBuyData({ network: networkId, mobile_number: phone, plan: planId })
            : maskawasubBuyData({ network: networkId, mobile_number: phone, plan: planId }),
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
