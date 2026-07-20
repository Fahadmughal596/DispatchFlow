"use client";

import { useEffect, useRef, useState } from "react";
import { completeTruckerOnboardingAction } from "@/actions/profile";
import { EquipmentSelect, type EquipmentOption } from "@/components/equipment-select";

const DISMISS_KEY = "dispatchflow_trucker_profile_popup_dismissed";
const TOTAL_STEPS = 3;

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
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [truckCount, setTruckCount] = useState(1);

  useEffect(() => {
    const dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    setOpen(!dismissed);
  }, []);

  function dismissPopup() {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  function validateStep() {
    const form = formRef.current;
    if (!form) return false;
    const panel = form.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (!panel) return false;
    const fields = Array.from(panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus();
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((value) => Math.min(TOTAL_STEPS, value + 1));
  }

  if (!open) return null;

  const needsContact = truckCount > 2;

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
      <style>{`
        .profile-stepper { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin:18px 0 22px; }
        .profile-step { display:flex; align-items:center; gap:8px; color:#7f8da8; font-size:.78rem; font-weight:700; }
        .profile-step span { display:grid; place-items:center; width:28px; height:28px; border-radius:999px; background:#e8edf5; color:#60708f; }
        .profile-step.active { color:#13233f; }
        .profile-step.active span, .profile-step.complete span { background:#2563eb; color:white; }
        .profile-step-panel { min-height:240px; }
        .contact-us-panel { border:1px solid #f59e0b55; background:#fffbeb; border-radius:16px; padding:18px; margin-top:14px; }
        .contact-us-panel h3 { margin:0 0 6px; }
        .profile-popup-actions { display:flex; justify-content:space-between; gap:12px; margin-top:22px; }
        .profile-popup-actions-right { display:flex; gap:10px; margin-left:auto; }
        @media (max-width:640px) {
          .profile-step { flex-direction:column; text-align:center; font-size:.68rem; }
          .profile-popup-actions { flex-wrap:wrap; }
          .profile-popup-actions-right { width:100%; }
          .profile-popup-actions-right .btn { flex:1; }
        }
      `}</style>

      <div className="profile-popup-card card" onMouseDown={(event) => event.stopPropagation()}>
        <button
          className="profile-popup-close"
          type="button"
          aria-label="Close profile reminder"
          onClick={dismissPopup}
        >
          ×
        </button>

        <div className="profile-popup-heading">
          <span className="eyebrow">Account setup</span>
          <h2 id="profile-popup-title">Complete your profile</h2>
          <p>Complete these three steps so your dispatcher can manage your account correctly.</p>
        </div>

        <div className="profile-stepper" aria-label="Profile setup progress">
          {["Personal Info", "Company Info", "Equipment Info"].map((label, index) => {
            const number = index + 1;
            return (
              <div className={`profile-step ${step === number ? "active" : ""} ${step > number ? "complete" : ""}`} key={label}>
                <span>{step > number ? "✓" : number}</span>
                {label}
              </div>
            );
          })}
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form ref={formRef} action={completeTruckerOnboardingAction}>
          <div className="profile-step-panel">
            <div className="form-grid" data-step="1" hidden={step !== 1}>
                <div className="field">
                  <label>Email</label>
                  <input value={email} disabled />
                </div>
                <div className="field">
                  <label>Full name</label>
                  <input name="name" defaultValue={name} required />
                </div>
                <div className="field">
                  <label>Phone number</label>
                  <input name="phone" defaultValue={phone || ""} required />
                </div>
                <div className="field">
                  <label>Address</label>
                  <input name="address" placeholder="Street, city, state" required />
                </div>
              </div>

            <div className="form-grid" data-step="2" hidden={step !== 2}>
                <div className="field">
                  <label>Company name</label>
                  <input name="companyName" required />
                </div>
                <div className="field">
                  <label>Company address</label>
                  <input name="companyAddress" required />
                </div>
                <div className="field">
                  <label>MC / DOT number</label>
                  <input name="mcDot" placeholder="MC or DOT number" />
                </div>
                <div className="field">
                  <label>Package type</label>
                  <input name="packageType" placeholder="Weekly, monthly, custom..." required />
                </div>
                <div className="field">
                  <label>Billing method</label>
                  <select name="billingMethod" defaultValue="FIXED">
                    <option value="FIXED">Fixed package</option>
                    <option value="PERCENTAGE">Percentage based</option>
                  </select>
                </div>
                <div className="field">
                  <label>Rate percentage</label>
                  <input name="ratePercentage" type="number" step="0.01" min="0" max="100" />
                </div>
              </div>

            <div data-step="3" hidden={step !== 3}>
                <div className="form-grid">
                  <div className="field">
                    <label>Equipment type</label>
                    <EquipmentSelect options={equipmentOptions} />
                  </div>
                  <div className="field">
                    <label>Number of trucks</label>
                    <input
                      name="numberOfTrucks"
                      type="number"
                      min="1"
                      defaultValue="1"
                      required
                      onChange={(event) => setTruckCount(Number(event.target.value || 0))}
                    />
                  </div>
                  <div className="field">
                    <label>Truck current location</label>
                    <input name="truckCurrentLocation" required />
                  </div>
                </div>

                {needsContact ? (
                  <div className="contact-us-panel">
                    <h3>Fleet setup required</h3>
                    <p>You selected more than two trucks. Please contact our team for a customized multi-truck setup.</p>
                    <a className="btn btn-primary" href="/portal/support">Contact Us</a>
                  </div>
                ) : null}
            </div>
          </div>

          <div className="profile-popup-actions">
            <button className="btn btn-secondary" type="button" onClick={dismissPopup}>
              Complete later
            </button>

            <div className="profile-popup-actions-right">
              {step > 1 ? (
                <button className="btn btn-secondary" type="button" onClick={() => setStep((value) => value - 1)}>
                  Back
                </button>
              ) : null}

              {step < TOTAL_STEPS ? (
                <button className="btn btn-primary" type="button" onClick={nextStep}>
                  Next
                </button>
              ) : (
                <button className="btn btn-primary" type="submit" disabled={needsContact}>
                  Save and complete profile
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
