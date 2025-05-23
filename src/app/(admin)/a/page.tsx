// app/admin/page.tsx
import { auth } from "@/auth";
import Link from "next/link";
import { fetchTeachers, fetchStudents, fetchClasses } from "@/lib/fetchAdminData";
import AddClassComponent from "@/components/admin/AddClass";
import ViewTeachers from "@/components/admin/ViewTeachersComponent";
import ViewClassSectionsPage from "@/components/admin/ViewClassSectionPage";
import ViewStudentPage from "@/components/admin/ViewStudentPage";
import Sider from "@/components/admin/navigator";
import { redirect } from "next/navigation";
// import AddTeacher from "bin/adminPage/admin not use/AddTeacher";
export default async function AdminPage() {
  const session = await auth();

  const userId = session?.user?.id;
  //const userId ="cm9q0nf8z0004bowkhzw2d3s0";

  console.log(session)
  if (!userId) {
    redirect("/login");
  }

  // Fetch user details
  const userRes = await fetch(`https://commercial.aiclassroom.in/api/users/${userId}`, { cache: "no-store" });
  const userData = await userRes.json();

  let institutionData = null;

  // Fetch institution details if institutionId exists
  if (userData?.institutionId) {
    const institutionRes = await fetch(`https://commercial.aiclassroom.in/api/institutions/${userData.institutionId}`, {
      cache: "no-store",
    });
    institutionData = await institutionRes.json();
  }
  console.log(userData)
  if (!institutionData) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h1 style={{ color: "red" }}>No institution found. Please create one.</h1>
        <Link href="/a/dashboard">Create Institution</Link>
      </div>
    );
  }
  console.log(institutionData)
  const id = institutionData.id
  const teachers = await fetchTeachers(institutionData.id);
  const students = await fetchStudents();
  const classes = await fetchClasses();

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      {/* Sidebar 
      <div style={{ width: "25%", padding: "20px", background: "#f7f7f7", height: "100vh" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>Admin Panel</h2>
        <ul style={{ listStyle: "none", padding: "0" }}>
          <li><Link href="/admin/add-teacher">Add Teacher</Link></li>
          <li><Link href="/components/admin/AddClass">Add Class</Link></li>
          <li><Link href="/admin/view-teachers">View Teachers</Link></li>
          <li><Link href="/admin/view-students">Student Management</Link></li>
          <li><Link href="/admin/view-classes">Teacher Management</Link></li>
        </ul>
        <div style={{ marginTop: "40px" }}>
          <Link href="/admin/departments">Manage Departments</Link><br />
          <Link href="/admin/semesters">Manage Semesters</Link><br />
          <Link href="/admin/profile">Profile</Link>
        </div>
      </div>*/}
      <Sider id={id} userId={userId} />
      {/* Profile Section */}




    </div>
  );
}
