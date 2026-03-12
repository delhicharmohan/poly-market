import { verifyWebhookSignature, signPayloadRaw, getSignedPayloadString } from './lib/xpaysafe';

const apiSecret = "6d6015a618d919c4e57060dafee5ed95a21173392d79987322c7ebaf22266fa30db1aa3882b057fc920ccc604f2072debb790a23fc33166aa28184d018619a89";
const salt = "9aac664f100988e2358cb1f95c3729de9e4be634fa51ad8708162d8da570474b";

const payload = {
  payout_id: "PAYOUT_123",
  orderId: "PAYOUT-123",
  status: "SUCCESS"
};

const payloadString = getSignedPayloadString(payload);
const encodedSigBase64 = signPayloadRaw(payloadString, apiSecret, salt);

const isValidBase64 = verifyWebhookSignature(payloadString, encodedSigBase64, apiSecret, salt);
console.log("Is Valid Signature (base64):", isValidBase64);
