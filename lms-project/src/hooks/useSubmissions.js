import { useState, useEffect } from "react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useSubmissions(assignmentId) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionCount, setSubmissionCount] = useState(0);

  useEffect(() => {
    if (!assignmentId) return;

    const unsubscribe = onSnapshot(
      collection(db, "assignments", assignmentId, "submissions"),
      (snapshot) => {
        const submissionsData = snapshot.docs.map((doc) => ({
          userId: doc.id,
          ...doc.data(),
        }));

        setSubmissions(submissionsData);
        setSubmissionCount(submissionsData.length);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching submissions:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [assignmentId]);

  return { submissions, loading, submissionCount };
}
