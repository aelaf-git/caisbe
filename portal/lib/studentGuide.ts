export const portalName = "myCAISBE";

export type GuideSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export const studentGuideIntro =
  "myCAISBE is the CAISBE education portal. From here you can register, buy courses, study, submit assignments and quizzes, take exams, download certificates, join the discussion forum, and contact CAISBE with a ticket.";

export const studentGuideSections: GuideSection[] = [
  {
    title: "Create your account",
    items: [
      "Open www.caisbe.org and choose Register, or open myCAISBE and choose Register.",
      "Enter your full name, email, country, and a password that meets the strength rules shown on the form.",
      "Student membership is included when you register.",
      "Open the verification link sent to your email. The link expires in 72 hours. You cannot sign in until the email is verified.",
    ],
  },
  {
    title: "Log in",
    items: [
      "Open myCAISBE and choose Sign in.",
      "Enter the email and password you registered with.",
      "If you forget the password, choose Forgot password and use the link sent to your email.",
      "Administrators use the Admin site. A student account cannot sign in there, and an admin account cannot sign in here.",
    ],
  },
  {
    title: "Use the dashboard",
    paragraphs: [
      "After you sign in you land on Dashboard. The left menu is how you move around myCAISBE.",
    ],
    items: [
      "Dashboard shows courses in progress, courses awaiting payment, completed courses, and credentials.",
      "Open My Progress in the left menu. It lists each course with course progress, learning progress, assignment progress, exam status (Eligible, Not eligible, or No exam), outstanding requirements, and certification status (Issued or Under progress).",
      "Use the Current, Completed, Submission, and Credentials tabs to switch lists.",
      "My courses lists programs you already have, plus other published courses you can add.",
      "My Assignments, My Progress, Cart, Certificates, Discussion forum, and Membership are under Learning.",
      "Help and Support, Tickets, Notifications, and Manage profile are under Account. Public site, at the bottom of the menu, opens www.caisbe.org. The public site header can send you back to myCAISBE.",
      "This User Guide stays in the menu under Overview.",
    ],
  },
  {
    title: "Update your profile",
    paragraphs: ["Open Manage profile at the bottom of the left menu."],
    items: [
      "Profile details: update your name, phone, location, and other contact records. Email cannot be changed here.",
      "Appearance: choose a theme, font, and text size. The choice applies only to your myCAISBE account.",
      "Change my password: enter your current password and a new one.",
      "Security questions: save answers you can use if you need to recover the account.",
      "Supporting documents: upload files requested for your membership or enrollment.",
      "My invoices and My orders: open a receipt, then print it or download the PDF.",
    ],
  },
  {
    title: "Enroll in a course",
    items: [
      "Open My courses.",
      "Under Available courses, or Add another course if you already have one, read the description and price.",
      "Choose Add to cart to buy several courses together, then open Cart and check out.",
      "Or choose Buy now to pay for that course on its own.",
      "If a course is already yours, myCAISBE tells you and leaves the other programs available.",
      "A course waiting for payment stays under Awaiting payment. Choose Complete payment to finish checkout.",
      "After payment succeeds, the course opens from My courses. A receipt is available under Manage profile, and a link is sent when email is configured.",
    ],
  },
  {
    title: "Study the course",
    items: [
      "Open the course and work through topics in order. The next topic unlocks when the current one is complete.",
      "Chapter readings, quizzes, and assignments unlock after the topics in that chapter are complete.",
      "Reading materials and videos stay inside the course. Course files are not offered as downloads, and video controls do not include a download button.",
      "You can type and paste answers into quiz and assignment fields.",
      "When every topic is finished, the course stays open. A completed course shows Review course, and inside it you can choose Back to course materials.",
    ],
  },
  {
    title: "Submit assignments and quizzes",
    items: [
      "Open My Assignments on the dashboard or in the left menu. You can also open an assignment inside the course after that chapter’s topics are complete.",
      "The dashboard lists how many assignments are pending, under review, or evaluated, and shows the next due dates. Overdue work is marked.",
      "Filter the list by All, Pending, Submitted, or Evaluated, then open an assignment.",
      "Download the assignment when a file is attached, or read the written instructions on the page.",
      "Submit coursework as a file or a written answer. After it sends, you get a confirmation that it is submitted and under review.",
      "If the instructor allows another try, the button becomes Resubmit. You can unsubmit while the work is still under review.",
      "A late submission is marked as submitted after the due date.",
      "When the work is evaluated, the grade and instructor feedback appear on the assignment. Earlier attempts stay in the assignment history.",
      "If a file will not upload or a due date looks wrong, open a ticket from Technical support.",
      "Quizzes are answered inside the course. Choose Submit when you are ready. The result is shown after you submit.",
    ],
  },
  {
    title: "Take an exam",
    paragraphs: [
      "A course exam appears after every topic in the course is complete. Courses without a final exam do not show one.",
    ],
    items: [
      "Open the course and select the exam.",
      "Read the three agreement screens: exam information, exam rules and academic integrity, then confidentiality and professional conduct. Check I agree on each screen.",
      "Choose Agree & start exam. The timer starts then, when the exam is timed.",
      "If the exam is secure, complete the camera and fullscreen pre-check before Start exam. The camera check confirms you are present and does not record the exam.",
      "Copy, paste, print, and right-click are blocked during a secure exam. Leaving the exam window is logged, and too many violations fail that attempt.",
      "Review your answers, then choose Submit exam. If time runs out, the exam is submitted for you.",
      "A score below the pass mark can be taken again. Correct answers are not shown.",
    ],
  },
  {
    title: "Download certificates",
    items: [
      "Open Certificates.",
      "A course certificate is issued after you finish every topic, and after you pass the final exam when the course has one.",
      "Open the certificate, then view, print, or download the PDF. The program name printed on it is the wording set for that course.",
      "Student membership includes a membership certificate. Download it from Certificates or Membership.",
      "Dashboard → Credentials lists course certificates you have already earned.",
    ],
  },
  {
    title: "Membership, forum, and messages",
    items: [
      "Membership shows your current type and lets you upgrade or renew. Paid memberships go through checkout.",
      "Discussion forum lists boards. Open a board to read, start a discussion, or reply.",
      "Notifications collects course, event, payment, and account messages. Unread items are also flagged on the dashboard.",
      "Help and Support lists FAQs, a technical-problem ticket, and request tables for courses, certificates, your account, contacting CAISBE, and reporting a problem. The same page is on www.caisbe.org/help when you are signed in.",
      "Tickets is where you follow those requests. You receive a ticket number and can reply in the same thread.",
      "You can also email info@caisbe.org or use the contact form on www.caisbe.org.",
    ],
  },
];
