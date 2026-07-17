"use client";

import { useState } from "react";
import { completeConsultantProfilePopupAction } from "@/actions/profile";

type Props = {
  name: string;
  email: string;
  phone?: string | null;
  specialty?: string | null;
  workingHours?: string | null;
  timeZone?: string | null;
  bio?: string | null;
  commissionRate: number;
};

export function ConsultantProfilePopup(props: Props) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="consultant-popup-backdrop" role="dialog" aria-modal="true" aria-labelledby="consultant-profile-title">
      <div className="consultant-popup-card">
        <button className="consultant-popup-close" type="button" onClick={() => setOpen(false)} aria-label="Complete later">×</button>
        <div className="consultant-popup-intro">
          <span className="consultant-popup-kicker">Dispatcher setup</span>
          <h2 id="consultant-profile-title">Complete your professional profile</h2>
          <p>This information is shown to your assigned truckers and is used for commission reporting.</p>
          <div className="consultant-popup-benefits">
            <span>✓ Build trust with assigned truckers</span>
            <span>✓ Set availability and specialty</span>
            <span>✓ Confirm dispatch commission</span>
          </div>
        </div>
        <form action={completeConsultantProfilePopupAction} className="consultant-popup-form">
          <div className="form-grid">
            <div className="field"><label>Full name</label><input name="name" defaultValue={props.name} required /></div>
            <div className="field"><label>Email</label><input value={props.email} disabled /></div>
            <div className="field"><label>Phone</label><input name="phone" defaultValue={props.phone || ""} required /></div>
            <div className="field"><label>Specialty</label><input name="specialty" defaultValue={props.specialty || ""} placeholder="Dry van, reefer, flatbed..." required /></div>
            <div className="field"><label>Working hours</label><input name="workingHours" defaultValue={props.workingHours || ""} placeholder="Mon–Fri, 8 AM–6 PM" required /></div>
            <div className="field"><label>Time zone</label><input name="timeZone" defaultValue={props.timeZone || ""} placeholder="America/Chicago" required /></div>
            <div className="field"><label>Dispatch commission (%)</label><input name="commissionRate" type="number" min="0" max="100" step="0.01" defaultValue={props.commissionRate} required /></div>
          </div>
          <div className="field"><label>Short professional bio</label><textarea name="bio" defaultValue={props.bio || ""} placeholder="Tell truckers how you help them book and manage profitable loads." required /></div>
          <div className="consultant-popup-actions">
            <button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}>Complete later</button>
            <button className="btn btn-primary" type="submit">Save & continue</button>
          </div>
        </form>
      </div>
    </div>
  );
}
