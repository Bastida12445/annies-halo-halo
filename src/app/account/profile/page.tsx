import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CalendarDays, FileText, LockKeyhole, PackageCheck, UserRound } from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { ProfileSecurity } from "@/components/profile-security";
import { T } from "@/components/language-provider";
import { requireCustomer } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/config";
import { formatDateTime } from "@/lib/money";

export const metadata: Metadata = { title: "Professional profile" };

export default async function ProfilePage() {
  if (!getSupabaseConfig()) {
    return (
      <section className="customer-account-page">
        <div className="form-shell">
          <h1><T en="Profile setup is not complete" fil="Hindi pa kumpleto ang profile setup" /></h1>
          <p className="muted"><T en="Connect Supabase to manage customer account settings." fil="Ikonekta ang Supabase para mapamahalaan ang settings ng customer account." /></p>
        </div>
      </section>
    );
  }

  const { supabase, user } = await requireCustomer("/account/profile");
  const result = await supabase
    .from("profiles")
    .select("full_name,phone,default_delivery_address,terms_accepted_at,privacy_acknowledged_at,created_at")
    .eq("id", user.id)
    .maybeSingle();

  let profile = result.data;
  let deliveryAddressAvailable = !result.error;
  let profileLoadFailed = false;
  if (result.error?.code === "42703" || result.error?.code === "PGRST204") {
    deliveryAddressAvailable = false;
    const legacyResult = await supabase
      .from("profiles")
      .select("full_name,phone,terms_accepted_at,privacy_acknowledged_at,created_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = legacyResult.data
      ? { ...legacyResult.data, default_delivery_address: null }
      : null;
    profileLoadFailed = Boolean(legacyResult.error);
  } else if (result.error) {
    profileLoadFailed = true;
  }

  return (
    <section className="customer-account-page profile-settings-page">
      <div className="profile-page-heading">
        <div>
          <span className="eyebrow"><T en="Customer settings" fil="Settings ng customer" /></span>
          <h1><T en="Professional Profile" fil="Propesyonal na profile" /></h1>
          <p className="customer-page-intro">
            <T
              en="Manage your personal details, sign-in email, password security, and customer records."
              fil="Ayusin ang personal na detalye, email sa pag-log in, seguridad ng password, at mga record ng customer."
            />
          </p>
        </div>
        <span className="profile-account-badge">
          <UserRound size={17} aria-hidden="true" />
          <T en="Customer account" fil="Account ng customer" />
        </span>
      </div>

      <nav className="profile-section-nav" aria-label="Profile settings sections">
        <a href="#personal-details"><T en="Personal details" fil="Personal na detalye" /></a>
        <a href="#email-settings"><T en="Email" fil="Email" /></a>
        <a href="#password-settings"><T en="Security" fil="Seguridad" /></a>
        <a href="#account-records"><T en="Account records" fil="Mga record ng account" /></a>
      </nav>

      {profileLoadFailed && (
        <p className="form-error" role="alert">
          <T en="We could not load your saved profile details. Refresh the page before making changes." fil="Hindi ma-load ang naka-save mong detalye. I-refresh ang page bago magbago ng impormasyon." />
        </p>
      )}

      {!deliveryAddressAvailable && profile && (
        <p className="profile-setup-note" role="status">
          <T en="Your personal details are available. Default delivery address settings are still being prepared." fil="Available ang personal na detalye mo. Inihahanda pa ang default delivery address settings." />
        </p>
      )}

      <div className="profile-settings-sections">
        <section className="content-card profile-setting-card" id="personal-details">
          <div className="profile-setting-heading">
            <span className="profile-setting-icon"><UserRound size={19} aria-hidden="true" /></span>
            <div>
              <span className="eyebrow"><T en="Your information" fil="Iyong impormasyon" /></span>
              <h2><T en="Personal details" fil="Personal na detalye" /></h2>
            </div>
          </div>
          {profile ? (
            <ProfileForm
              fullName={profile.full_name ?? ""}
              phone={profile.phone ?? ""}
              defaultDeliveryAddress={profile.default_delivery_address ?? ""}
              showDeliveryAddress={deliveryAddressAvailable}
            />
          ) : (
            <p className="form-error" role="alert">
              <T en="Your profile could not be loaded, so editing is temporarily unavailable." fil="Hindi ma-load ang profile mo kaya pansamantalang hindi ito mae-edit." />
            </p>
          )}
        </section>

        <ProfileSecurity
          email={user.email ?? ""}
        />

        <section className="content-card profile-setting-card" id="account-records">
          <div className="profile-setting-heading">
            <span className="profile-setting-icon"><FileText size={19} aria-hidden="true" /></span>
            <div>
              <span className="eyebrow"><T en="Your account" fil="Iyong account" /></span>
              <h2><T en="Account records & activity" fil="Mga record at aktibidad ng account" /></h2>
            </div>
          </div>

          <div className="profile-record-grid">
            <Link className="profile-record-link" href="/account/orders">
              <PackageCheck size={19} aria-hidden="true" />
              <span><strong><T en="Orders & payments" fil="Mga order at bayad" /></strong><small><T en="Review your order history and payment status." fil="Tingnan ang history ng order at status ng bayad." /></small></span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link className="profile-record-link" href="/account/reservations">
              <CalendarDays size={19} aria-hidden="true" />
              <span><strong><T en="Reservations" fil="Mga reservation" /></strong><small><T en="Review your requests and reservation updates." fil="Tingnan ang mga request at update sa reservation." /></small></span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <dl className="profile-account-facts">
            <div>
              <dt><T en="Account created" fil="Petsa ng paggawa ng account" /></dt>
              <dd>{profile?.created_at ? formatDateTime(profile.created_at) : <T en="Not available" fil="Hindi available" />}</dd>
            </div>
            <div>
              <dt><T en="Terms accepted" fil="Tinanggap ang Terms" /></dt>
              <dd>{profile?.terms_accepted_at ? formatDateTime(profile.terms_accepted_at) : <T en="Not recorded" fil="Walang record" />}</dd>
            </div>
            <div>
              <dt><T en="Privacy notice acknowledged" fil="Kinilala ang Privacy Notice" /></dt>
              <dd>{profile?.privacy_acknowledged_at ? formatDateTime(profile.privacy_acknowledged_at) : <T en="Not recorded" fil="Walang record" />}</dd>
            </div>
          </dl>

          <div className="profile-policy-links">
            <Link href="/terms"><LockKeyhole size={15} aria-hidden="true" /><T en="Terms of service" fil="Terms of service" /></Link>
            <Link href="/privacy"><FileText size={15} aria-hidden="true" /><T en="Privacy notice" fil="Privacy Notice" /></Link>
          </div>
        </section>
      </div>
    </section>
  );
}
