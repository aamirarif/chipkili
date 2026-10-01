import "server-only";
import { store } from "lib/store";
import { newId } from "lib/crypto";
import { fillTemplate, getSettings } from "lib/settings";
import { sendEmail, sendSms } from "lib/notify";
import { prettyPhone } from "lib/phone";
import type { Lead, LeadType, Media } from "lib/types";

const TYPE_LABEL: Record<LeadType, string> = {
  message: "Message about an item",
  contact: "Contact form",
  sell: "Sell to ChipKili",
  find: "Find it for me",
};

export type NewLead = {
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  itemId?: string;
  message: string;
  fields?: Record<string, string>;
  media?: Media[];
  source?: string;
  visitorId?: string;
};

export type LeadOutcome = { lead: Lead; ownerSms: boolean; ownerEmail: boolean; buyerSms: boolean };

export async function createLead(input: NewLead): Promise<LeadOutcome> {
  const db = store();
  const now = new Date().toISOString();
  const lead: Lead = {
    id: newId(),
    type: input.type,
    status: "new",
    name: input.name,
    phone: input.phone,
    email: input.email,
    itemId: input.itemId,
    message: input.message,
    fields: input.fields ?? {},
    media: input.media ?? [],
    source: input.source,
    visitorId: input.visitorId,
    createdAt: now,
    updatedAt: now,
  };
  // saved first, so a lead is never lost if a text or email fails
  await db.put("leads", lead);

  const settings = await getSettings();
  const item = input.itemId ? await db.get("items", input.itemId) : null;
  const itemName = item?.title ?? TYPE_LABEL[input.type];
  const vars = {
    name: input.name.split(" ")[0],
    phone: prettyPhone(input.phone),
    item: item ? item.title.slice(0, 60) : TYPE_LABEL[input.type],
    price: item?.price,
    message: input.message.slice(0, 120),
  };

  const ownerBody = item
    ? fillTemplate(settings.smsLeadToOwner, vars)
    : `ChipKili ${TYPE_LABEL[input.type]}: ${vars.name} ${vars.phone}. Msg: "${vars.message}". Text them back directly.`;
  const ownerSms = await sendSms(settings.alertPhone, ownerBody);

  const fieldLines = Object.entries(lead.fields).map(([k, v]) => `${k}: ${v}`);
  const ownerEmail = await sendEmail(
    settings.alertEmail,
    `ChipKili: ${TYPE_LABEL[input.type]} from ${input.name}${item ? ` about ${item.title}` : ""}`,
    [
      `${TYPE_LABEL[input.type]}`,
      `Name: ${input.name}`,
      `Phone (verified): ${prettyPhone(input.phone)}`,
      input.email ? `Email: ${input.email}` : "",
      item ? `Item: ${item.title} ($${item.price}) ${item.code}` : "",
      "",
      input.message,
      "",
      ...fieldLines,
      lead.media.length ? `\n${lead.media.length} photo(s)/video(s) attached in Admin.` : "",
      input.source ? `Source: ${input.source}` : "",
      "",
      "Open it in Admin: /admin/leads",
    ]
      .filter((l) => l !== "")
      .join("\n"),
  );

  const reply = fillTemplate(item ? settings.smsAutoReply : settings.smsContactAutoReply, vars);
  const buyerSms = await sendSms(input.phone, reply);

  return { lead, ownerSms: ownerSms.ok, ownerEmail: ownerEmail.ok, buyerSms: buyerSms.ok };
}

export async function logActivity(who: string, action: string, target?: string): Promise<void> {
  await store().put("activity", { id: newId(), at: new Date().toISOString(), who, action, target });
}
