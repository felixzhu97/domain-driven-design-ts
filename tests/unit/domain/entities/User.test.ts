import { User } from "../../../../src/domain/entities/User";
import { Email, Address } from "../../../../src/domain/value-objects";

describe("User 实体", () => {
  const createValidEmail = () => Email.create("test@example.com");
  const createValidAddress = () =>
    Address.create({
      country: "中国",
      province: "北京市",
      city: "北京市",
      district: "海淀区",
      street: "中关村大街1号",
      postalCode: "100000",
    });

  describe("创建用户", () => {
    it("应该能创建有效用户", () => {
      const email = createValidEmail();
      const address = createValidAddress();

      const user = User.create(email, "测试用户", "hashedpassword", address);

      expect(user.email).toBe(email);
      expect(user.name).toBe("测试用户");
      expect(user.isActive).toBe(true);
      expect(user.isSuspended).toBe(false);
      expect(user.addresses).toHaveLength(1);
    });

    it("应该能创建不带地址的用户", () => {
      const email = createValidEmail();

      const user = User.create(email, "测试用户", "hashedpassword");

      expect(user.addresses).toHaveLength(0);
    });

    it("应该拒绝空用户名", () => {
      const email = createValidEmail();

      expect(() => User.create(email, "", "hashedpassword")).toThrow(
        "用户名不能为空"
      );
      expect(() => User.create(email, "   ", "hashedpassword")).toThrow(
        "用户名不能为空"
      );
    });

    it("应该拒绝过长的用户名", () => {
      const email = createValidEmail();
      const longName = "a".repeat(101);

      expect(() => User.create(email, longName, "hashedpassword")).toThrow(
        "用户名长度不能超过100个字符"
      );
    });

    it("应该拒绝空密码", () => {
      const email = createValidEmail();

      expect(() => User.create(email, "测试用户", "")).toThrow("密码不能为空");
    });
  });

  describe("用户状态管理", () => {
    let user: User;

    beforeEach(() => {
      const email = createValidEmail();
      user = User.create(email, "测试用户", "hashedpassword");
    });

    it("应该能激活用户", () => {
      user.deactivate();
      expect(user.isActive).toBe(false);

      user.activate();
      expect(user.isActive).toBe(true);
    });

    it("应该能停用用户", () => {
      expect(user.isActive).toBe(true);

      user.deactivate();
      expect(user.isActive).toBe(false);
    });

    it("应该能暂停用户", () => {
      expect(user.isSuspended).toBe(false);

      user.suspend("违规行为");
      expect(user.isSuspended).toBe(true);
    });

    it("应该能恢复暂停的用户", () => {
      user.suspend("违规行为");
      expect(user.isSuspended).toBe(true);

      user.unsuspend();
      expect(user.isSuspended).toBe(false);
    });
  });

  describe("邮箱管理", () => {
    let user: User;

    beforeEach(() => {
      const email = createValidEmail();
      user = User.create(email, "测试用户", "hashedpassword");
    });

    it("应该能更改邮箱", () => {
      const newEmail = Email.create("newemail@example.com");

      user.changeEmail(newEmail);
      expect(user.email).toBe(newEmail);
    });

    it("应该拒绝相同的邮箱", () => {
      const sameEmail = Email.create("test@example.com");

      expect(() => user.changeEmail(sameEmail)).toThrow("新邮箱与当前邮箱相同");
    });
  });

  describe("密码管理", () => {
    let user: User;

    beforeEach(() => {
      const email = createValidEmail();
      user = User.create(email, "测试用户", "hashedpassword");
    });

    it("应该能更改密码", () => {
      user.changePassword("newhashedpassword");
      expect(user.verifyPassword("newhashedpassword")).toBe(true);
    });

    it("应该能验证密码", () => {
      expect(user.verifyPassword("hashedpassword")).toBe(true);
      expect(user.verifyPassword("wrongpassword")).toBe(false);
    });

    it("应该拒绝空密码", () => {
      expect(() => user.changePassword("")).toThrow("密码不能为空");
    });
  });

  describe("地址管理", () => {
    let user: User;

    beforeEach(() => {
      const email = createValidEmail();
      user = User.create(email, "测试用户", "hashedpassword");
    });

    it("应该能添加地址", () => {
      const address = createValidAddress();

      user.addAddress(address);
      expect(user.addresses).toHaveLength(1);
      expect(user.addresses[0]).toBe(address);
    });

    it("应该能添加多个地址", () => {
      const address1 = createValidAddress();
      const address2 = Address.create({
        country: "中国",
        province: "上海市",
        city: "上海市",
        district: "浦东新区",
        street: "陆家嘴环路1000号",
        postalCode: "200000",
      });

      user.addAddress(address1);
      user.addAddress(address2);

      expect(user.addresses).toHaveLength(2);
    });

    it("应该限制地址数量", () => {
      // 添加10个地址
      for (let i = 0; i < 10; i++) {
        const address = Address.create({
          country: "中国",
          province: "北京市",
          city: "北京市",
          district: "海淀区",
          street: `测试街道${i}号`,
          postalCode: "100000",
        });
        user.addAddress(address);
      }

      // 尝试添加第11个地址
      const extraAddress = createValidAddress();
      expect(() => user.addAddress(extraAddress)).toThrow(
        "最多只能添加10个地址"
      );
    });

    it("应该能移除地址", () => {
      const address = createValidAddress();
      user.addAddress(address);

      expect(user.addresses).toHaveLength(1);

      user.removeAddress(address);
      expect(user.addresses).toHaveLength(0);
    });

    it("移除不存在的地址应该失败", () => {
      const address = createValidAddress();

      expect(() => user.removeAddress(address)).toThrow("地址不存在");
    });
  });

  describe("用户名更改", () => {
    let user: User;

    beforeEach(() => {
      const email = createValidEmail();
      user = User.create(email, "测试用户", "hashedpassword");
    });

    it("应该能更改用户名", () => {
      user.changeName("新用户名");
      expect(user.name).toBe("新用户名");
    });

    it("应该自动清理用户名空格", () => {
      user.changeName("  新用户名  ");
      expect(user.name).toBe("新用户名");
    });

    it("应该拒绝空用户名", () => {
      expect(() => user.changeName("")).toThrow("用户名不能为空");
      expect(() => user.changeName("   ")).toThrow("用户名不能为空");
    });

    it("应该拒绝过长的用户名", () => {
      const longName = "a".repeat(101);
      expect(() => user.changeName(longName)).toThrow(
        "用户名长度不能超过100个字符"
      );
    });
  });
});
