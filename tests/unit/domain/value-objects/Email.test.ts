import { Email } from "../../../../src/domain/value-objects/Email";

describe("Email 值对象", () => {
  describe("创建邮箱", () => {
    it("应该能创建有效的邮箱地址", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "admin123@company.org",
        "contact+info@website.net",
      ];

      validEmails.forEach((emailString) => {
        const email = Email.create(emailString);
        expect(email.value).toBe(emailString);
      });
    });

    it("应该规范化邮箱地址（转为小写）", () => {
      const email = Email.create("Test.User@EXAMPLE.COM");
      expect(email.value).toBe("test.user@example.com");
    });

    it("应该拒绝无效的邮箱格式", () => {
      const invalidEmails = [
        "",
        "invalid-email",
        "@domain.com",
        "user@",
        "user@domain",
        "user name@domain.com",
        "user@domain..com",
      ];

      invalidEmails.forEach((emailString) => {
        expect(() => Email.create(emailString)).toThrow();
      });
    });

    it("应该拒绝过长的邮箱地址", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      expect(() => Email.create(longEmail)).toThrow(
        "邮箱地址长度不能超过254个字符"
      );
    });
  });

  describe("邮箱比较", () => {
    it("相同邮箱应该相等", () => {
      const email1 = Email.create("test@example.com");
      const email2 = Email.create("test@example.com");

      expect(email1.equals(email2)).toBe(true);
    });

    it("不同邮箱应该不相等", () => {
      const email1 = Email.create("test1@example.com");
      const email2 = Email.create("test2@example.com");

      expect(email1.equals(email2)).toBe(false);
    });

    it("大小写不同的相同邮箱应该相等", () => {
      const email1 = Email.create("Test@Example.Com");
      const email2 = Email.create("test@example.com");

      expect(email1.equals(email2)).toBe(true);
    });
  });

  describe("邮箱域名操作", () => {
    it("应该能获取邮箱域名", () => {
      const email = Email.create("user@example.com");
      expect(email.getDomain()).toBe("example.com");
    });

    it("应该能获取邮箱本地部分", () => {
      const email = Email.create("user.name@example.com");
      expect(email.getLocalPart()).toBe("user.name");
    });

    it("应该能检查是否是企业邮箱", () => {
      const personalEmail = Email.create("user@gmail.com");
      const corporateEmail = Email.create("user@company.com");

      expect(personalEmail.isPersonalEmail()).toBe(true);
      expect(corporateEmail.isPersonalEmail()).toBe(false);
    });
  });

  describe("邮箱验证", () => {
    it("应该验证邮箱有效性", () => {
      const email = Email.create("test@example.com");
      expect(email.isValid()).toBe(true);
    });

    it("应该能检查邮箱是否可接收邮件", () => {
      const email = Email.create("test@example.com");
      // 这里只是示例，实际可能需要DNS查询
      expect(email.canReceiveEmail()).toBe(true);
    });
  });

  describe("toString 方法", () => {
    it("应该返回邮箱字符串", () => {
      const emailString = "test@example.com";
      const email = Email.create(emailString);

      expect(email.toString()).toBe(emailString);
      expect(String(email)).toBe(emailString);
    });
  });
});
