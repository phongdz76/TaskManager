import moment from "moment";

export const generateGoogleCalendarLink = (task, guestEmails = []) => {
  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";

  const params = new URLSearchParams();

  // text (Title)
  if (task.title) {
    params.append("text", task.title.trim());
  } else {
    params.append("text", "New Task");
  }

  // details (Description + Checklist)
  let detailsText = "";
  if (task.description) {
    detailsText += task.description.trim() + "\n\n";
  }

  if (task.todoChecklist && task.todoChecklist.length > 0) {
    detailsText += "--- Checklist ---\n";
    task.todoChecklist.forEach((todo, index) => {
      detailsText += `- ${todo.text}\n`;
    });
  }

  if (detailsText.trim()) {
    params.append("details", detailsText.trim());
  }

  // Handle dates: Default to today if startDate is missing
  let startObj = task.startDate ? moment(task.startDate) : moment();
  const startStr = startObj.format("YYYYMMDD");
  let endStr;

  if (task.dueDate) {
    const endObj = moment(task.dueDate);
    endObj.add(1, "days");
    endStr = endObj.format("YYYYMMDD");
  } else {
    // If no due date, the event lasts 1 day (ends exactly on the start date)
    // We clone startObj to prevent mutating the original startObj if we reuse it
    const endObj = startObj.clone().add(1, "days");
    endStr = endObj.format("YYYYMMDD");
  }

  params.append("dates", `${startStr}/${endStr}`);

  if (guestEmails && guestEmails.length > 0) {
    params.append("add", guestEmails.join(","));
  }

  return `${baseUrl}&${params.toString()}`;
};
