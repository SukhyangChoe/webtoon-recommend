const unsafePattern = /[<>]|https?:\/\/|www\.|\b[^\s@]+@[^\s@]+\.[^\s@]+\b|(?:\d[\s.-]*){8,}/iu;

export function validateMatchNickname(input) {
  if (typeof input !== "string") {
    return { valid: false, nickname: "", length: 0, message: "닉네임을 입력해 주세요." };
  }

  const nickname = input.normalize("NFC").trim().replace(/\s+/g, " ");
  const length = Array.from(nickname).length;

  if (length === 0) return { valid: false, nickname, length, message: "2~20자로 입력해 주세요." };
  if (length < 2) return { valid: false, nickname, length, message: `한 글자 더 입력해 주세요. (현재 ${length}자)` };
  if (length > 20) return { valid: false, nickname, length, message: `20자 이내로 입력해 주세요. (현재 ${length}자)` };
  if (unsafePattern.test(nickname)) return { valid: false, nickname, length, message: "링크, 이메일, 전화번호는 닉네임으로 사용할 수 없어요." };

  return { valid: true, nickname, length, message: `${length}/20자` };
}

export function sanitizeMatchNickname(input) {
  const validation = validateMatchNickname(input);
  if (!validation.valid) throw new Error("NICKNAME_REJECTED");
  return validation.nickname;
}
