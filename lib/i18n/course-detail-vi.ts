/** Default benefit cards (Vietnamese) when course_benefits is empty. */

export type DefaultBenefitCard = {
  icon: string;
  title: string;
  description: string;
};

export const DEFAULT_COURSE_BENEFIT_CARDS: DefaultBenefitCard[] = [
  {
    icon: "award",
    title: "Nh\u1EADn ch\u1EE9ng ch\u1EC9",
    description:
      "Ghi nh\u1EADn ho\u00E0n th\u00E0nh kh\u00F3a tr\u00EAn h\u1ED3 s\u01A1 EduAI.",
  },
  {
    icon: "trophy",
    title: "Tham gia cu\u1ED9c thi",
    description:
      "\u01AFu ti\u00EAn s\u1EF1 ki\u1EC7n v\u00E0 th\u1EED th\u00E1ch theo l\u1ED9 tr\u00ECnh.",
  },
  {
    icon: "calendar",
    title: "Tr\u1EE3 c\u1EA5p linh ho\u1EA1t",
    description: "H\u1ECDc theo ti\u1EBFn \u0111\u1ED9 c\u00E1 nh\u00E2n, xem l\u1EA1i khi c\u1EA7n.",
  },
  {
    icon: "gift",
    title: "Nh\u1EADn qu\u00E0",
    description:
      "Ch\u01B0\u01A1ng tr\u00ECnh \u0111i\u1EC3m th\u01B0\u1EDFng v\u00E0 qu\u00E0 t\u1EB7ng theo t\u1EEBng \u0111\u1EE3t.",
  },
];
