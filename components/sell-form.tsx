"use client";

import { LeadForm } from "components/lead-form";
import { CONDITIONS, CONDITION_LABEL } from "lib/types";

export function SellForm({ categories, preset }: { categories: string[]; preset?: string }) {
  return (
    <LeadForm
      type="sell"
      allowUploads
      askEmail
      messageLabel="What do you want to sell?"
      initialMessage={preset ? `${preset}: ` : ""}
      submitLabel="Send for an offer"
      sentTitle="Sent! Kili is on it."
      sentText="We look at your photos and text you an offer. Usually within a day."
      extraFields={[
        { name: "Business name", label: "Business name", half: true },
        { name: "Town or ZIP", label: "Town or ZIP", required: true, half: true },
        { name: "Category", label: "Category", kind: "select", options: categories, required: true, half: true },
        { name: "Brand and model", label: "Brand and model", half: true },
        { name: "Condition", label: "Condition", kind: "select", options: CONDITIONS.map((c) => CONDITION_LABEL[c]), required: true, half: true },
        { name: "Quantity", label: "Quantity", half: true, placeholder: "1" },
        { name: "Does it work", label: "Does it work?", kind: "select", options: ["Yes", "No", "Not sure"], required: true, half: true },
        { name: "Asking price", label: "Asking price", half: true, placeholder: "$" },
        { name: "Pickup notes", label: "Pickup notes", kind: "textarea", placeholder: "Loading dock, stairs, which floor, parking" },
        { name: "How soon", label: "How soon must it go?", kind: "select", options: ["This week", "This month", "No rush"], half: true },
        { name: "Owner", label: "I own these items or am allowed to sell them.", kind: "checkbox", required: true },
      ]}
    />
  );
}

export function FindForm({ categories, preset }: { categories: string[]; preset?: string }) {
  return (
    <LeadForm
      type="find"
      messageLabel="What are you hunting for?"
      initialMessage={preset ?? ""}
      submitLabel="Send to Kili"
      sentTitle="Kili is on the hunt."
      sentText="We text you when we find it. Reply STOP any time to cancel."
      extraFields={[
        { name: "Category", label: "Category", kind: "select", options: categories, half: true },
        { name: "Brand or model", label: "Brand or model", half: true },
        { name: "Budget from", label: "Budget from", half: true, placeholder: "$" },
        { name: "Budget up to", label: "Budget up to", required: true, half: true, placeholder: "$" },
        { name: "Condition OK", label: "Conditions you accept", kind: "select", options: ["Any", "New only", "New or open box", "Used is fine"], half: true },
        { name: "How soon", label: "How soon", kind: "select", options: ["This week", "This month", "No rush"], half: true },
        { name: "Town or ZIP", label: "Town or ZIP", required: true, half: true },
      ]}
    />
  );
}

export function ContactForm({ about }: { about?: string }) {
  return (
    <LeadForm
      type="contact"
      askEmail
      initialMessage={about ? `About listing ${about}: ` : ""}
      submitLabel="Send message"
      sentText="Kili got your message. Someone will text you shortly."
      extraFields={[
        { name: "Subject", label: "Subject", kind: "select", options: ["General question", "Buying", "Selling to ChipKili", "Find it for me", "Delivery", "Report a listing"], required: true },
      ]}
    />
  );
}
