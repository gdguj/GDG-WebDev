(async function authGuard() {
  const localToken = localStorage.getItem("gdgAuthToken");
  const sessionToken = sessionStorage.getItem("gdgAuthToken");
  const token = localToken || sessionToken;

  if (!token) {
    redirectToAuth();
    return;
  }

  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearAuthStorage();
      redirectToAuth();
      return;
    }

    const result = await response.json();
    if (!result.success || !result.user) {
      clearAuthStorage();
      redirectToAuth();
      return;
    }
  } catch (error) {
    clearAuthStorage();
    redirectToAuth();
  }

  function clearAuthStorage() {
    localStorage.removeItem("gdgAuthToken");
    localStorage.removeItem("gdgCurrentUser");
    sessionStorage.removeItem("gdgAuthToken");
    sessionStorage.removeItem("gdgCurrentUser");
  }

  function redirectToAuth() {
    const currentPath = `${window.location.pathname.split("/").pop() || ""}`;
    const target = currentPath ? `?redirect=${encodeURIComponent(currentPath)}` : "";
    window.location.href = `auth.html${target}`;
  }
})();
