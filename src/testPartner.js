import { generatePartnerId } from "./services/partner.service.js";

const test = async () => {
  try {
    const result = await generatePartnerId(123);

    console.log("Generated Partner:", result.partnerId);
    console.log("Partner Number:", result.partnerNumber);
    console.log("Member:", result.member.memberName);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

test();