"use client";

import { useEffect, useState } from "react";
import { completeTruckerOnboardingAction } from "@/actions/profile";
import { EquipmentSelect, type EquipmentOption } from "@/components/equipment-select";

const DISMISS_KEY = "dispatchflow_trucker_profile_popup_dismissed";

export function TruckerProfilePopup({
  name,
  email,
  phone,
  error,
  equipmentOptions
}: {
  name: string;
  email: string;
  phone: string | null;
  error?: string;
  equipmentOptions: EquipmentOption[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    setOpen(!dismissed);
  }, []);

  function dismissPopup() {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="profile-popup-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-popup-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismissPopup();
      }}
    >
      <div className="profile-popup-card card" onMouseDown={(event) => event.stopPropagation()}>
        <button
          className="profile-popup-close"
          type="button"
          aria-label="Close profile reminder"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            dismissPopup();
          }}
        >
          ×
        </button>

        <div className="profile-popup-heading">
          <span className="eyebrow">Account setup</span>
          <h2 id="profile-popup-title">Complete your profile</h2>
          <p>
            You are already inside your dashboard. Add your truck and package details to complete your account.
            You can finish this later from Profile. This reminder will return in a new browser session until your profile is complete.
          </p>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form action={completeTruckerOnboardingAction}>
          <div className="form-grid">
            <div className="field">
              <label>Full name</label>
              <input name="name" defaultValue={name} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={email} disabled />
            </div>
            <div className="field">
              <label>Phone</label>
              <input name="phone" defaultValue={phone || ""} required />
            </div>
            <div className="field">
              <label>Equipment type</label>
              <EquipmentSelect options={equipmentOptions} />
            </div>
            <div className="field">
              <label>Package type</label>
              <input name="packageType" placeholder="Weekly, monthly, custom..." required />
            </div>
            <div className="field">
              <label>Truck current location</label>
              <input name="truckCurrentLocation" required />
            </div>
            <div className="field">
              <label>Company name (optional)</label>
              <input name="companyName" />
            </div>
            <div className="field">
              <label>Billing method</label>
              <select name="billingMethod" defaultValue="FIXED">
                <option value="FIXED">Fixed package</option>
                <option value="PERCENTAGE">Percentage based</option>
              </select>
            </div>
            <div className="field">
              <label>Rate percentage (percentage billing only)</label>
              <input name="ratePercentage" type="number" step="0.01" min="0" max="100" />
            </div>
          </div>

          <div className="profile-popup-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                dismissPopup();
              }}
            >
              Complete later
            </button>
            <button className="btn btn-primary" type="submit">
              Save and complete profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
