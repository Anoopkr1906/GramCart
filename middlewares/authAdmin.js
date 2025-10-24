import { clerkClient } from "@clerk/nextjs/server";


const authAdmin = async (userId) => {
    try {
        if(!userId) return false;

        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        return process.env.ADMIN_EMAIL.split(",").includes(user.emailAddresses[0].emailAddress);
    } catch (error) {
        console.error(error);
        return false;
    }
}

export default authAdmin;



// import { clerkClient } from "@clerk/nextjs/server";

// const authAdmin = async (userId) => {
//   if (!userId) {
//     console.log("authAdmin: no userId provided");
//     return false;
//   }

//   try {
//     const user = await clerkClient.users.getUser(userId);

//     const email =
//       user?.emailAddresses?.find((e) => e?.primary)?.emailAddress ||
//       user?.emailAddresses?.[0]?.emailAddress;

//     console.log("authAdmin: user email:", email);
//     const adminList = (process.env.ADMIN_EMAIL || "")
//       .split(",")
//       .map(s => s.trim().toLowerCase())
//       .filter(Boolean);

//     console.log("authAdmin: adminList:", adminList);
//     return !!email && adminList.includes(email.toLowerCase());
//   } catch (err) {
//     console.error("authAdmin error:", err);
//     return false;
//   }
// };

// export default authAdmin;