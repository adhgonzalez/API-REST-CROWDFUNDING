# Crowdfunding Core API

A RESTful API built with TypeScript, Express, and Mongoose to manage a crowdfunding platform. It features a clean 3-entity domain model (Users, Projects, and Contributions) with rewards embedded as subdocuments.

## Key Features

*   **TypeScript:** Strict type configurations without using `any`.
*   **Data Integrity:** Uses Mongoose Transactions to ensure donations and project balance updates succeed or fail together.
*   **Error Handling:** Centralized Express middleware for clean JSON error responses.

---

## Technical Stack

*   **Runtime & Language:** Node.js, TypeScript
*   **Framework & Database:** Express, MongoDB (Mongoose)

