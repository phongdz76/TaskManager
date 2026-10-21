import { describe, it, expect } from "vitest";
import { generateGoogleCalendarLink } from "@frontend/utils/calendarUtils.js";
import moment from "moment";

describe("generateGoogleCalendarLink", () => {
  it("should generate a valid calendar link for a full task", () => {
    const task = {
      title: "Test Project Deadline",
      description: "Complete all remaining features",
      startDate: "2024-01-01T00:00:00.000Z",
      dueDate: "2024-01-05T00:00:00.000Z",
      todoChecklist: [
        { text: "Feature A" },
        { text: "Feature B" }
      ]
    };
    
    const link = generateGoogleCalendarLink(task);
    
    expect(link).toContain("calendar.google.com/calendar/render?action=TEMPLATE");
    expect(link).toContain("text=Test+Project+Deadline");
    expect(link).toContain("details=Complete+all+remaining+features");
    expect(link).toContain("Feature+A");
    expect(link).toContain("Feature+B");
    expect(link).toContain("dates=20240101%2F20240106"); // End date is +1 day for all-day events
  });

  it("should default to 'New Task' when title is missing", () => {
    const task = {};
    const link = generateGoogleCalendarLink(task);
    expect(link).toContain("text=New+Task");
  });

  it("should create a 1-day event when dueDate is missing", () => {
    const task = {
      startDate: "2024-05-10T00:00:00.000Z"
    };
    const link = generateGoogleCalendarLink(task);
    expect(link).toContain("dates=20240510%2F20240511");
  });

  it("should include guest emails if provided", () => {
    const task = { title: "Meeting" };
    const guests = ["user1@example.com", "user2@example.com"];
    
    const link = generateGoogleCalendarLink(task, guests);
    expect(link).toContain("add=user1%40example.com%2Cuser2%40example.com");
  });

  it("should use today's date if startDate is missing", () => {
    const task = { title: "Today Task" };
    const link = generateGoogleCalendarLink(task);
    
    const today = moment().format("YYYYMMDD");
    const tomorrow = moment().add(1, "days").format("YYYYMMDD");
    
    expect(link).toContain(`dates=${today}%2F${tomorrow}`);
  });
});
