# 📝 NestJS Activity Logger

This is a **NestJS-compatible activity logging service** that records user actions like `create`, `update`, and `delete` for any resource (e.g., post, user). It stores what changed, who did it, and when — making it ideal for **auditing**, **admin logs**, or **history tracking**.

---

## 🚀 Features

- Logs `create`, `update`, `delete`, and custom actions
- Stores resource name, user ID, and optional descriptions
- Captures full payload or `before/after` data for updates
- Uses MongoDB (Mongoose) and supports timestamps
- Easily injectable in any service

---

## 📁 File Structure

src/
└── modules/
└── activity/
├── activity.module.ts
├── activity.service.ts
└── schemas/
└── activity.schema.ts

## 🧱 How It Works

Each activity is saved as a MongoDB document with:

```ts
{
  userId: string;
  action: 'create' | 'update' | 'delete' | string;
  resource: string;
  description?: string;
  payload?: any; // before/after states, new object, deleted object
  createdAt: Date;
  updatedAt: Date;
}
```

<!-- add this to your code where you need to add -->

        await this.activityService.logActivity({ userId: userId, action: "Create", resource: "Post", description: "Creted a new post", payload: post })


