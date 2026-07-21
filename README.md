# Crowdfunding Core API

A REST API built with TypeScript, Express, and Mongoose for a crowdfunding platform. The domain model relies on 3 main entities (Users, Projects, and Contributions), with rewards handled as embedded subdocuments.

## Key Features

* **TypeScript:** Strict typing (avoiding `any` shortcuts).
* **Data Integrity:** Keeping donations and project balances in sync.
* **Error Handling:** Centralized Express middleware for consistent JSON errors.

---

## Tech Stack

* Node.js & TypeScript
* Express
* MongoDB (via Mongoose)

---

## Under the Hood: Business Logic

This isn't just a basic CRUD. The API enforces specific rules to keep the data and the math consistent across collections.

### 1. Users
* **Roles:** Users are either `creator` or `backer`. This determines what they can do (e.g., only creators can start projects).
* **Security:** Passwords are automatically hashed on save/update.
* **Cascading Deletes:** Deleting a `backer` hard-deletes their profile. But if you delete a `creator`, we don't wipe their projects (which would break the transaction history for their backers). Instead, their projects are automatically soft-deleted by setting their status to `cancelled`.

### 2. Projects
* **Creation:** The API verifies that the `creatorId` actually belongs to an existing user with the `creator` role.
* **Filtering:** The `GET` endpoint supports dynamic queries (like `$gte` for `goalAmount`, exact status matches, or filtering directly by the creator's email).
* **Locked States:** Once a project is `funded`, `failed`, or `cancelled`, it becomes read-only to prevent tampering.
* **Protected Fields:** You can't just `PATCH` a project's `currentAmount` to cheat the goal. That field is locked and only gets updated automatically when a contribution is made.
* **Safe Deletion:**
  * *Hard delete:* If a project has raised 0€, it gets completely removed from the DB.
  * *Soft delete:* If it has received any funds, we block the hard delete to keep the financial logs intact. It just gets marked as `cancelled`.

### 3. Contributions
* **Creating Pledges:** Before saving, we check if the project is `active` and the amount is valid (> 0). If it passes, the contribution is saved and the project's `currentAmount` is incremented.
* **Updating (PATCH):** If a backer modifies their pledge, the logic calculates the exact difference (e.g., upgrading from 50 to 70 means adding 20 to the project) and updates the parent project's total safely.
* **Deleting:** If a contribution is withdrawn or deleted, the exact amount is deducted from the parent project's balance before the record is destroyed, so the math always checks out.