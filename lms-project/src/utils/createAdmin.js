import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";

export async function createFirstAdmin() {
  try {
    // Create admin user
    const { user } = await createUserWithEmailAndPassword(
      auth,
      "admin@videmy.com", // Change this email
      "admin123456" // Change this password
    );

    // Set admin role in Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: "Admin User",
      email: "admin@videmy.com",
      role: "admin",
      createdAt: new Date().toISOString(),
    });

    console.log("Admin created successfully!");
    return user;
  } catch (error) {
    console.error("Error creating admin:", error);
  }
}
