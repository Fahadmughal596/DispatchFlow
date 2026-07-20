"use client";

import { useMemo, useState } from "react";
import { updateTruckerProfileAction } from "@/actions/profile";

type EquipmentOption = { id: number; name: string; commissionBps: number };
type Props = {
  user: { name: string; email: string; phone: string | null };
  profile: {
    profileImagePath: string | null;
    address: string | null;
    companyName: string | null;
    companyAddress: string | null;
    numberOfTrucks: number | null;
    mcDot: string | null;
    equipmentCategoryId: number | null;
    packageType: string | null;
    truckCurrentLocation: string | null;
    availability: string | null;
    factoringCompany: string | null;
    insuranceStatus: string | null;
    billingMethod: "FIXED" | "PERCENTAGE";
    ratePercentageBps: number | null;
    preferredLanes: string | null;
    avoidedLanes: string | null;
  };
  equipment: EquipmentOption[];
};

export function TruckerProfileSettingsForm({ user, profile, equipment }: Props) {
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<string | null>(
    profile.profileImagePath
      ? `/api/profile-image?path=${encodeURIComponent(profile.profileImagePath)}`
      : null
  );
  const [truckCount, setTruckCount] = useState(profile.numberOfTrucks || 1);
  const initials = useMemo(
    () => user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    [user.name]
  );
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
            <p>Add your contact details and a clear profile picture so your dispatcher can identify your account quickly.</p>
          </div>

          <div className="profile-photo-editor">
            <div className="profile-photo-preview">
              {preview ? <img src={preview} alt="Profile preview" /> : <span>{initials}</span>}
            </div>
            <div>
              <strong>Profile picture</strong>
              <p>Upload a JPG, PNG or WEBP image up to 5MB.</p>
              <label className="btn btn-secondary btn-sm">
                Choose picture
                <input
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  name="profileImage"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setPreview(URL.createObjectURL(file));
                  }}
                  type="file"
                />
              </label>
            </div>
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
            <p>Keep your business, authority, insurance and billing details current for dispatch operations.</p>
          </div>
          <div className="form-grid">
            <div className="field"><label>Company name</label><input name="companyName" defaultValue={profile.companyName || ""} /></div>
            <div className="field"><label>Company address</label><input name="companyAddress" defaultValue={profile.companyAddress || ""} /></div>
            <div className="field"><label>MC / DOT</label><input name="mcDot" defaultValue={profile.mcDot || ""} /></div>
            <div className="field"><label>Factoring company</label><input name="factoringCompany" defaultValue={profile.factoringCompany || ""} /></div>
            <div className="field"><label>Insurance status</label><input name="insuranceStatus" defaultValue={profile.insuranceStatus || ""} /></div>
            <div className="field"><label>Billing method</label><select name="billingMethod" defaultValue={profile.billingMethod}><option value="FIXED">Fixed package</option><option value="PERCENTAGE">Percentage based</option></select></div>
            <div className="field"><label>Custom rate percentage (optional)</label><input name="ratePercentage" type="number" step="0.01" min="0" max="100" defaultValue={profile.ratePercentageBps ? profile.ratePercentageBps / 100 : ""} /></div>
          </div>
        </section>

        <section className={step === 3 ? "profile-step-panel active" : "profile-step-panel"}>
          <div className="profile-section-heading">
            <span>Step 3 of 3</span>
            <h2>Truck & Operations</h2>
            <p>Tell us about your trucks, equipment, availability and preferred operating lanes.</p>
          </div>
          <div className="form-grid">
            <div className="field"><label>Number of trucks</label><input name="numberOfTrucks" type="number" min="1" value={truckCount} onChange={(event) => setTruckCount(Number(event.target.value || 1))} /></div>
            <div className="field"><label>Equipment type</label><select name="equipmentCategoryId" defaultValue={profile.equipmentCategoryId || ""} required><option value="" disabled>Select equipment</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div className="field"><label>Package type</label><input name="packageType" defaultValue={profile.packageType || ""} required /></div>
            <div className="field"><label>Truck current location</label><input name="truckCurrentLocation" defaultValue={profile.truckCurrentLocation || ""} required /></div>
            <div className="field"><label>Availability</label><input name="availability" defaultValue={profile.availability || ""} /></div>
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
