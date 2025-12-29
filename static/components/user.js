// ================================
//  APINOW AUTH VALIDATION SCRIPT
// ================================

async function fetchUser(apiKey) {
    const urlsToTry = [
        `/get_user?id=${apiKey}`,
        `/get_user?key=${apiKey}`,
        `/get_user/${apiKey}`
    ];

    for (const url of urlsToTry) {
        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + apiKey,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                const json = await res.json();
                return json?.data?.[0] || null;
            }
        } catch (err) {
            console.warn("Auth fetch attempt failed:", err);
        }
    }

    return null;
}

// ======================================================================
//  MAIN FUNCTION — Call this on any protected page
// ======================================================================
export async function requireAuth() {
    try {
        const apiKey = localStorage.getItem("api_key");

        if (!apiKey) {
            console.warn("NO API KEY — Redirecting to login");
            window.location.href = "/signup";
            return null;
        }

        const user = await fetchUser(apiKey);

        if (!user) {
            console.warn("INVALID USER — Redirecting to login");
            localStorage.removeItem("api_key");
            window.location.href = "/signup";
            return null;
        }

        console.log("Authenticated User:", user);
        return user;

    } catch (error) {
        console.error("AUTH ERROR:", error);
        window.location.href = "/signup";
        return null;
    }
}

// ======================================================================
//  AUTO RUN — If page is protected, set window.PROTECTED = true
// ======================================================================
if (window.PROTECTED) {
    requireAuth();
}