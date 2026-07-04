import { EventStream } from "../../../validation/EventStream";

export class TenantProjection {
  private guests: Record<string, any> = {};

  constructor(eventStream: EventStream) {
    const stream = eventStream.getStream();
    
    // Build projection from events
    for (const record of stream) {
      if (record.eventName === "GuestInvited") {
        this.guests[record.payload.email] = { status: "Invited", propertyId: record.payload.propertyId };
      } else if (record.eventName === "GuestAccepted") {
        if (this.guests[record.payload.email]) {
           this.guests[record.payload.email].status = "Accepted";
        }
      } else if (record.eventName === "GuestLogin") {
        if (this.guests[record.payload.email]) {
           this.guests[record.payload.email].status = "Verified";
        }
      }
    }
  }

  public getGuest(email: string) {
    return this.guests[email];
  }
}
