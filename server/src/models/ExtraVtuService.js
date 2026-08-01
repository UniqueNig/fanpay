import mongoose from "mongoose";

// An admin-registered network/provider beyond the hardcoded defaults in
// services/maskawasub.js's MASKAWASUB_NETWORK/MASKAWASUB_CABLE/MASKAWASUB_DISCO
// tables — for when Maskawasub adds an entirely new mobile network, cable
// company, or electricity disco that isn't one of the ones already mapped.
// Unlike the VTpass-era version of this model, there's no "merge into an
// existing network" concept — Maskawasub's bulk /user/ catalog already
// contains every plan for a network it knows about once that network's id
// is registered here, so this only ever introduces a brand-new key.
//
// - category "network" covers both airtime and data (Maskawasub uses the
//   same numeric network id for both, see MASKAWASUB_NETWORK).
// - `serviceID` holds the Maskawasub numeric id, as a string (kept as
//   String for continuity with the pre-migration schema and because
//   Mongoose unique indexes on numbers vs strings behave the same either way).
const extraVtuServiceSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["network", "cable", "electricity"], required: true },
    // The internal key this provider is looked up by everywhere else
    // (e.g. "smile", "startimes-2") — admin-chosen, must be unique per category.
    networkKey: { type: String, required: true },
    // Maskawasub's numeric id for this network/cable/disco, as a string.
    serviceID: { type: String, required: true },
    label: { type: String, required: true },
    // Only meaningful for category "network" (airtime/data network-picker color).
    color: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

extraVtuServiceSchema.index({ category: 1, networkKey: 1 }, { unique: true });

export const ExtraVtuService = mongoose.model("ExtraVtuService", extraVtuServiceSchema);
