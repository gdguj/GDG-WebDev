/**
 * Injects a logout button into the navbar and wires up the logout action.
 * Include this script at the bottom of any protected page.
 */
(function initLogout() {
  // Find the nav links container (the div holding the nav links)
  const navLinksDiv = document.querySelector("nav .flex.items-center.gap-8");
  if (navLinksDiv) {
    const btn = document.createElement("button");
    btn.textContent = "تسجيل الخروج";
    btn.setAttribute("dir", "rtl");
    btn.className =
      "logout-btn font-semibold text-red-500 hover:text-red-700 border border-red-300 hover:border-red-500 rounded-lg px-4 py-1.5 transition-colors";
    btn.addEventListener("click", logoutUser);
    navLinksDiv.appendChild(btn);
  }

  function logoutUser() {
    localStorage.removeItem("gdgAuthToken");
    localStorage.removeItem("gdgCurrentUser");
    sessionStorage.removeItem("gdgAuthToken");
    sessionStorage.removeItem("gdgCurrentUser");
    window.location.href = "auth.html";
  }
})();
