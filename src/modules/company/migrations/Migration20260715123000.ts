import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260715123000 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table if exists "company" add column if not exists "tax_id" text null;');
    this.addSql('alter table if exists "company" add column if not exists "sector" text null;');
    this.addSql(
      'alter table if exists "company" add column if not exists "onboarding_status" text not null default \'approved\';'
    );
    this.addSql(
      'alter table if exists "company" add column if not exists "payment_terms" text not null default \'bank_transfer\';'
    );
    this.addSql(
      'alter table if exists "company" add column if not exists "default_payment_method" text null;'
    );
    this.addSql(
      'alter table if exists "company" add column if not exists "saved_payment_methods" jsonb null;'
    );
    this.addSql(
      'alter table if exists "employee" add column if not exists "role" text not null default \'buyer\';'
    );
    this.addSql(
      'alter table if exists "employee" add column if not exists "status" text not null default \'active\';'
    );
    this.addSql(
      'alter table if exists "employee" add column if not exists "invitation_email" text null;'
    );
    this.addSql(
      'alter table if exists "employee" add column if not exists "invitation_token" text null;'
    );
    this.addSql(
      'alter table if exists "employee" add column if not exists "invited_at" timestamptz null;'
    );
    this.addSql(
      'alter table if exists "employee" add column if not exists "accepted_at" timestamptz null;'
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table if exists "employee" drop column if exists "accepted_at";');
    this.addSql('alter table if exists "employee" drop column if exists "invited_at";');
    this.addSql('alter table if exists "employee" drop column if exists "invitation_token";');
    this.addSql('alter table if exists "employee" drop column if exists "invitation_email";');
    this.addSql('alter table if exists "employee" drop column if exists "status";');
    this.addSql('alter table if exists "employee" drop column if exists "role";');
    this.addSql('alter table if exists "company" drop column if exists "saved_payment_methods";');
    this.addSql('alter table if exists "company" drop column if exists "default_payment_method";');
    this.addSql('alter table if exists "company" drop column if exists "payment_terms";');
    this.addSql('alter table if exists "company" drop column if exists "onboarding_status";');
    this.addSql('alter table if exists "company" drop column if exists "sector";');
    this.addSql('alter table if exists "company" drop column if exists "tax_id";');
  }
}
