// Canned responses for sandbox-mode developer API purchases — never calls
// any real provider (services/maskawasub.js, services/vtpass.js) and never
// touches real money. This is a hard isolation boundary: apiPurchase.js's
// sandbox path only ever calls functions in this file, so there is no code
// path from a sandbox request into a real provider or a real wallet debit.
// Shaped like Maskawasub's own response fields (Status/id/api_response) so
// a developer's integration code doesn't need to change when switching to
// live mode later.

function fakeId() {
  return "sandbox_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

export async function sandboxBuyAirtime({ network, mobile_number, amount }) {
  return {
    Status: "successful",
    id: fakeId(),
    api_response: `Sandbox: ₦${amount} ${network} airtime delivered to ${mobile_number} (simulated, no real airtime sent).`,
  };
}

export async function sandboxBuyData({ network, mobile_number, plan }) {
  return {
    Status: "successful",
    id: fakeId(),
    api_response: `Sandbox: ${network} data plan ${plan} delivered to ${mobile_number} (simulated, no real data sent).`,
  };
}
