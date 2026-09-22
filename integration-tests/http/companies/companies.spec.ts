import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import {
  adminHeaders,
  createAdminUser,
  createStoreUser,
} from "../../utils/admin";
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../utils/store";

jest.setTimeout(60 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    JWT_SECRET: process.env.JWT_SECRET || "test_jwt_secret_change_me",
  },
  testSuite: ({ api, getContainer }) => {
    let storeHeaders, customer;

    const companyPayload = (name = "Test Company") => ({
      name,
      email:
        name === "Test Company"
          ? "test@company.com"
          : `${name.toLowerCase().replace(/\s+/g, "-")}@company.com`,
      phone: "1234567890",
      address: "123 Test St",
      city: "Test City",
      state: "Test State",
      zip: "12345",
      country: "Test Country",
      logo_url: "http://test.com/logo.png",
      currency_code: "USD",
      spending_limit_reset_frequency: "monthly",
    });

    const createCompany = async (headers, name = "Test Company") => {
      return (
        await api.post("/store/companies", companyPayload(name), headers)
      ).data.companies[0];
    };

    const bootstrapCompanyAdmin = async (headers, companyId, customerId) => {
      return (
        await api.post(
          `/store/companies/${companyId}/employees`,
          {
            customer_id: customerId,
            role: "company_admin",
            is_admin: true,
            status: "active",
          },
          headers
        )
      ).data.employee;
    };

    const createAuthenticatedStoreUser = async (email) => {
      const publishableKey = await generatePublishableKey(getContainer());
      const headers = generateStoreHeaders({ publishableKey });
      const storeUser = await createStoreUser({
        api,
        storeHeaders: headers,
        email,
      });
      headers.headers["Authorization"] = `Bearer ${storeUser.token}`;

      return { headers, customer: storeUser.customer };
    };

    beforeEach(async () => {
      const container = getContainer();
      await createAdminUser(adminHeaders, container);
      const publishableKey = await generatePublishableKey(container);
      storeHeaders = generateStoreHeaders({ publishableKey });
      const res = await createStoreUser({ api, storeHeaders });
      customer = res.customer;
      storeHeaders.headers["Authorization"] = `Bearer ${res.token}`;
    });

    describe("POST /store/companies", () => {
      it("successfully creates a company", async () => {
        const response = await api.post(
          "/store/companies",
          companyPayload(),
          storeHeaders
        );

        expect(response.status).toEqual(200);
        expect(response.data.companies[0]).toMatchObject({
          id: expect.any(String),
          name: "Test Company",
          email: "test@company.com",
          phone: "1234567890",
          address: "123 Test St",
          city: "Test City",
          state: "Test State",
          zip: "12345",
          country: "Test Country",
          logo_url: "http://test.com/logo.png",
          currency_code: "USD",
        });
      });
    });

    describe("GET /store/companies/:id", () => {
      it("successfully retrieves a company", async () => {
        const company = await createCompany(storeHeaders);
        await bootstrapCompanyAdmin(storeHeaders, company.id, customer.id);

        const response2 = await api.get(
          `/store/companies/${company.id}`,
          storeHeaders
        );

        expect(response2.data.company).toMatchObject({
          id: expect.any(String),
          name: "Test Company",
          email: "test@company.com",
          phone: "1234567890",
          address: "123 Test St",
          city: "Test City",
          state: "Test State",
          zip: "12345",
          country: "Test Country",
          logo_url: "http://test.com/logo.png",
          currency_code: "USD",
        });
      });

      it("should throw error when company does not exist", async () => {
        const { response } = await api
          .get(`/store/companies/does-not-exist`, storeHeaders)
          .catch((e) => e);

        expect(response.status).toEqual(403);
      });

      it("rejects access to another company's details", async () => {
        const companyA = await createCompany(storeHeaders, "Company A");
        await bootstrapCompanyAdmin(storeHeaders, companyA.id, customer.id);

        const userB = await createAuthenticatedStoreUser("buyer-b@email.com");
        const companyB = await createCompany(userB.headers, "Company B");
        await bootstrapCompanyAdmin(
          userB.headers,
          companyB.id,
          userB.customer.id
        );

        const getResponse = await api
          .get(`/store/companies/${companyA.id}`, userB.headers)
          .catch((e) => e);
        const employeesResponse = await api
          .get(`/store/companies/${companyA.id}/employees`, userB.headers)
          .catch((e) => e);
        const updateResponse = await api
          .post(
            `/store/companies/${companyA.id}`,
            { name: "Hijacked Company" },
            userB.headers
          )
          .catch((e) => e);
        const deleteResponse = await api
          .delete(`/store/companies/${companyA.id}`, userB.headers)
          .catch((e) => e);

        expect(getResponse.response.status).toEqual(403);
        expect(employeesResponse.response.status).toEqual(403);
        expect(updateResponse.response.status).toEqual(403);
        expect(deleteResponse.response.status).toEqual(403);
      });
    });

    describe("POST /store/companies/:id", () => {
      let company1;

      beforeEach(async () => {
        company1 = await createCompany(storeHeaders);
        await bootstrapCompanyAdmin(storeHeaders, company1.id, customer.id);
      });

      it("successfully updates a company", async () => {
        const response = await api.post(
          `/store/companies/${company1.id}`,
          {
            name: "Updated Company",
            email: "updated@company.com",
            phone: "0987654321",
            address: "456 Updated Ave",
            city: "Updated City",
            state: "Updated State",
            zip: "54321",
            country: "Updated Country",
            logo_url: "http://updated.com/logo.png",
            currency_code: "EUR",
            spending_limit_reset_frequency: "yearly",
          },
          storeHeaders
        );

        expect(response.data.company).toMatchObject({
          id: company1.id,
          name: "Updated Company",
          email: "updated@company.com",
          phone: "0987654321",
          address: "456 Updated Ave",
          city: "Updated City",
          state: "Updated State",
          zip: "54321",
          country: "Updated Country",
          logo_url: "http://updated.com/logo.png",
          currency_code: "EUR",
        });
      });

      it("should throw an error when company does not exist", async () => {
        const { response } = await api
          .post(
            `/store/companies/does-not-exist`,
            { name: "Nonexistent Company" },
            storeHeaders
          )
          .catch((e) => e);

        expect(response.status).toEqual(403);
      });
    });

    describe("DELETE /store/companies/:id", () => {
      let company1;

      beforeEach(async () => {
        company1 = await createCompany(storeHeaders);
        await bootstrapCompanyAdmin(storeHeaders, company1.id, customer.id);
      });

      it("successfully deletes a company", async () => {
        const response = await api.delete(
          `/store/companies/${company1.id}`,
          storeHeaders
        );

        expect(response.status).toEqual(204);
      });

      it("should throw an error when company does not exist", async () => {
        const response = await api
          .delete(`/store/companies/does-not-exist`, storeHeaders)
          .catch((e) => e);

        expect(response.response.status).toEqual(403);
      });
    });
  },
});
