import React from "react";

const CourseCategory = {
  PECL1: "PECL1",
  PECL2: "PECL2",
  Program_Elective: "Program Elective",
  Open_Elective: "Open Elective",
  Honors: "Honors",
  Minor: "Minor",
  MDM: "MDM",
};

const PreferenceConfirmation = ({ preferences, onBack, onConfirm }) => {
  // Defensive: Ensure preferences.preferences exists
  const prefs = preferences.preferences || {};

  // Filter categories where choice1 or choice2 is non-empty string
  const selectedCourses = Object.entries(prefs).filter(
    ([_, choices]) => {
      const choice1 = choices?.choice1;
      const choice2 = choices?.choice2;
      return (choice1 != null && choice1 !== "") || (choice2 != null && choice2 !== "");
    }
  );

  // Ensure all categories are included with defaults empty strings
  const formattedPreferences = {};
  Object.values(CourseCategory).forEach((category) => {
    const current = prefs[category] || {};
    formattedPreferences[category] = {
      choice1: current.choice1 == null ? "" : String(current.choice1).trim(),
      choice2: current.choice2 == null ? "" : String(current.choice2).trim(),
    };
  });

  const handleConfirm = () => {
    const payload = {
      student_id: preferences.student_id || "",
      name: preferences.name || "Unknown",
      preferences: formattedPreferences,
      confirm: true,
      comments: preferences.comments == null ? "" : String(preferences.comments),
      status: "confirmed",
      updated_at: new Date().toISOString(),
    };
    onConfirm(payload);
  };

  return (
    <div>
      <h2>Selected Courses</h2>
      <ul>
        {selectedCourses.length > 0 ? (
          selectedCourses.map(([category, choices]) => (
            <li key={category}>
              <strong>{category}</strong>: Choice 1 - {choices.choice1 || "None"}, Choice 2 - {choices.choice2 || "None"}
            </li>
          ))
        ) : (
          <li>No courses selected.</li>
        )}
      </ul>
      <button onClick={onBack}>Back</button>
      <button onClick={handleConfirm}>Confirm</button>
    </div>
  );
};

export default PreferenceConfirmation;