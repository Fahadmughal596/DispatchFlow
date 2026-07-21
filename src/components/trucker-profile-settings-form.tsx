"use client";

import { useState } from "react";
import { updateTruckerProfileAction } from "@/actions/profile";

type EquipmentOption = { id: number; name: string; commissionBps: number };

const EQUIPMENT_RATE_BPS: Record<string, number> = {
  "dry van": 400,
  reefer: 400,
  flatbed: 400,
  "power only": 400,
  poweronly: 400,
  hotshot: 600,
  "box truck": 600
};

function equipmentRatePercent(name: string, fallbackBps: number) {
  const bps = EQUIPMENT_RATE_BPS[name.trim().toLowerCase()] ?? fallbackBps;
  return bps / 100;
}
type Props = {
  user: { name: string; email: string; phone: string | null };
  profile: {
    address: string | null;
    companyName: string | null;
    companyAddress: string | null;
    numberOfTrucks: number | null;
    mcDot: string | null;
    equipmentCategoryId: number | null;
    truckCurrentLocation: string | null;
    factoringCompany: string | null;
    insuranceStatus: string | null;
    preferredLanes: string | null;
    avoidedLanes: string | null;
  };
  equipment: EquipmentOption[];
};

export function TruckerProfileSettingsForm({ user, profile, equipment }: Props) {
  const [step, setStep] = useState(1);
  const [truckCount, setTruckCount] = useState(profile.numberOfTrucks || 1);
  const contactRequired = truckCount > 2;

  return (
    <div className="profile-settings-shell">
      <div className="profile-step-tabs" role="tablist" aria-label="Profile setup steps">
        {["Personal Information", "Company Information", "Truck & Operations"].map((label, index) => (
          <button
            className={`profile-step-tab ${step === index + 1 ? "active" : ""}`}
            key={label}
            onClick={() => setStep(index + 1)}
            type="button"
          >
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </div>

      <form action={updateTruckerProfileAction} encType="multipart/form-data" className="profile-step-form">
        <section className={step === 1 ? "profile-step-panel active" : "profile-step-panel"}>
          <div className="profile-section-heading">
            <span>Step 1 of 3</span>
            <h2>Personal Information</h2>
            <p>Keep your personal contact details accurate so your dispatcher can reach you when needed.</p>
          </div>

          <div className="form-grid">
            <div className="field"><label>Full name</label><input name="name" defaultValue={user.name} required /></div>
            <div className="field"><label>Email</label><input value={user.email} disabled /></div>
            <div className="field"><label>Phone</label><input name="phone" defaultValue={user.phone || ""} /></div>
            <div className="field"><label>Personal address</label><input name="address" defaultValue={profile.address || ""} /></div>
          </div>
        </section>

        <section className={step === 2 ? "profile-step-panel active" : "profile-step-panel"}>
          <div className="profile-section-heading">
            <span>Step 2 of 3</span>
            <h2>Company Information</h2>
            <p>Keep your company, authority, factoring and insurance information current for dispatch operations.</p>
          </div>
          <div className="form-grid">
            <div className="field"><label>Company name</label><input name="companyName" defaultValue={profile.companyName || ""} /></div>
            <div className="field"><label>Company address</label><input name="companyAddress" defaultValue={profile.companyAddress || ""} /></div>
            <div className="field"><label>MC / DOT</label><input name="mcDot" defaultValue={profile.mcDot || ""} /></div>
            <div className="field"><label>Factoring company</label><input name="factoringCompany" defaultValue={profile.factoringCompany || ""} /></div>
            <div className="field"><label>Insurance status</label><input name="insuranceStatus" defaultValue={profile.insuranceStatus || ""} /></div>
          </div>
        </section>

        <section className={step === 3 ? "profile-step-panel active" : "profile-step-panel"}>
          <div className="profile-section-heading">
            <span>Step 3 of 3</span>
            <h2>Truck & Operations</h2>
            <p>Tell us about your trucks, equipment, current location and preferred operating lanes.</p>
          </div>
          <div className="form-grid">
            <div className="field"><label>Number of trucks</label><input name="numberOfTrucks" type="number" min="1" value={truckCount} onChange={(event) => setTruckCount(Number(event.target.value || 1))} /></div>
            <div className="field"><label>Equipment type</label><select name="equipmentCategoryId" defaultValue={profile.equipmentCategoryId || ""} required><option value="" disabled>Select equipment</option>{equipment.map((item) => { const rate = equipmentRatePercent(item.name, item.commissionBps); return <option key={item.id} value={item.id}>{item.name} — {rate.toFixed(Number.isInteger(rate) ? 0 : 2)}%</option>; })}</select></div>
            <div className="field"><label>Truck current location</label><input name="truckCurrentLocation" defaultValue={profile.truckCurrentLocation || ""} required /></div>
          </div>
          <div className="field"><label>Preferred lanes</label><textarea name="preferredLanes" defaultValue={profile.preferredLanes || ""} /></div>
          <div className="field"><label>Avoided lanes</label><textarea name="avoidedLanes" defaultValue={profile.avoidedLanes || ""} /></div>
          {contactRequired ? (
            <div className="profile-contact-alert">
              <strong>More than two trucks?</strong>
              <p>Our team will create a custom dispatch setup for your fleet. Contact us before saving.</p>
              <a className="btn btn-primary" href="/portal/support">Contact Us</a>
            </div>
          ) : null}
        </section>

        <div className="profile-step-actions">
          <button className="btn btn-secondary" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))} type="button">Back</button>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={() => setStep((value) => Math.min(3, value + 1))} type="button">Next</button>
          ) : (
            <button className="btn btn-primary" disabled={contactRequired} type="submit">Save Profile</button>
          )}
        </div>
      </form>
    </div>
  );
}
