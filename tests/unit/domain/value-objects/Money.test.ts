import { Money } from "../../../../src/domain/value-objects/Money";

describe("Money 值对象", () => {
  describe("创建金额", () => {
    it("应该能创建有效的金额", () => {
      const money = Money.fromYuan(100);
      expect(money.amount).toBe(10000); // 100元 = 10000分
      expect(money.currency).toBe("CNY");
    });

    it("应该能从分创建金额", () => {
      const money = Money.fromCents(10000, "CNY");
      expect(money.amount).toBe(10000);
      expect(money.currency).toBe("CNY");
    });

    it("应该支持不同币种", () => {
      const cnyMoney = Money.fromYuan(100);
      const usdMoney = Money.fromCents(10000, "USD");

      expect(cnyMoney.currency).toBe("CNY");
      expect(usdMoney.currency).toBe("USD");
    });

    it("应该拒绝负数金额", () => {
      expect(() => Money.fromYuan(-100)).toThrow("金额不能为负数");
      expect(() => Money.fromCents(-1000, "CNY")).toThrow("金额不能为负数");
    });

    it("应该拒绝无效币种", () => {
      expect(() => Money.fromCents(1000, "INVALID" as any)).toThrow(
        "不支持的币种"
      );
    });
  });

  describe("金额计算", () => {
    it("应该能正确相加", () => {
      const money1 = Money.fromYuan(100);
      const money2 = Money.fromYuan(50);
      const result = money1.add(money2);

      expect(result.amount).toBe(15000); // 150元 = 15000分
    });

    it("应该能正确相减", () => {
      const money1 = Money.fromYuan(100);
      const money2 = Money.fromYuan(30);
      const result = money1.subtract(money2);

      expect(result.amount).toBe(7000); // 70元 = 7000分
    });

    it("应该能正确相乘", () => {
      const money = Money.fromYuan(100);
      const result = money.multiply(2.5);

      expect(result.amount).toBe(25000); // 250元 = 25000分
    });

    it("应该能正确相除", () => {
      const money = Money.fromYuan(100);
      const result = money.divide(4);

      expect(result.amount).toBe(2500); // 25元 = 2500分
    });

    it("不同币种不能进行运算", () => {
      const cnyMoney = Money.fromYuan(100);
      const usdMoney = Money.fromCents(10000, "USD");

      expect(() => cnyMoney.add(usdMoney)).toThrow(
        "不能对不同币种的金额进行运算"
      );
    });

    it("减法结果不能为负数", () => {
      const money1 = Money.fromYuan(50);
      const money2 = Money.fromYuan(100);

      expect(() => money1.subtract(money2)).toThrow("金额不能为负数");
    });

    it("除数不能为零", () => {
      const money = Money.fromYuan(100);

      expect(() => money.divide(0)).toThrow("除数不能为零");
    });
  });

  describe("金额比较", () => {
    it("相同金额应该相等", () => {
      const money1 = Money.fromYuan(100);
      const money2 = Money.fromYuan(100);

      expect(money1.equals(money2)).toBe(true);
    });

    it("不同金额应该不相等", () => {
      const money1 = Money.fromYuan(100);
      const money2 = Money.fromYuan(200);

      expect(money1.equals(money2)).toBe(false);
    });

    it("应该能比较大小", () => {
      const smaller = Money.fromYuan(50);
      const larger = Money.fromYuan(100);

      expect(smaller.isLessThan(larger)).toBe(true);
      expect(larger.isGreaterThan(smaller)).toBe(true);
      expect(smaller.isLessThanOrEqual(larger)).toBe(true);
      expect(larger.isGreaterThanOrEqual(smaller)).toBe(true);
    });

    it("不同币种不能比较", () => {
      const cnyMoney = Money.fromYuan(100);
      const usdMoney = Money.fromCents(10000, "USD");

      expect(() => cnyMoney.isLessThan(usdMoney)).toThrow(
        "不能比较不同币种的金额"
      );
    });
  });

  describe("特殊方法", () => {
    it("应该能创建零金额", () => {
      const zero = Money.zero();
      expect(zero.amount).toBe(0);
      expect(zero.isZero()).toBe(true);
    });

    it("应该能检查是否为正数", () => {
      const positive = Money.fromYuan(100);
      const zero = Money.zero();

      expect(positive.isPositive()).toBe(true);
      expect(zero.isPositive()).toBe(false);
    });

    it("应该能获取绝对值", () => {
      const money = Money.fromYuan(100);
      const abs = money.abs();

      expect(abs.amount).toBe(10000);
    });
  });

  describe("格式化显示", () => {
    it("应该能格式化为字符串", () => {
      const money = Money.fromYuan(1234.56);
      expect(money.toString()).toBe("¥1,234.56");
    });

    it("应该能显示不同币种的符号", () => {
      const cny = Money.fromYuan(100);
      const usd = Money.fromCents(10000, "USD");
      const eur = Money.fromCents(10000, "EUR");

      expect(cny.toString()).toContain("¥");
      expect(usd.toString()).toContain("$");
      expect(eur.toString()).toContain("€");
    });

    it("应该能格式化为简单数字", () => {
      const money = Money.fromYuan(123.45);
      expect(money.toSimpleString()).toBe("123.45");
    });
  });
});
