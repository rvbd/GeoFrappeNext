import frappe


@frappe.whitelist()
def get_user_theme():
	"""Return the active Geo theme for the current user."""
	user = frappe.session.user
	if not user or user == "Guest":
		return ""

	theme_doc = frappe.db.get_value(
		"Geo User Theme",
		{"user": user},
		"theme",
		as_dict=False,
	)
	return theme_doc or ""


def add_geo_theme_to_boot(bootinfo):
	"""Inject the user's Geo theme into frappe.boot so it's available synchronously on page load."""
	user = frappe.session.user
	if not user or user == "Guest":
		bootinfo.geo_theme = ""
		return

	theme = frappe.db.get_value(
		"Geo User Theme",
		{"user": user},
		"theme",
		as_dict=False,
	)
	bootinfo.geo_theme = theme or ""


@frappe.whitelist()
def set_user_theme(theme: str = ""):
	"""Persist the Geo theme selection for the current user."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(frappe._("Not permitted"), frappe.PermissionError)

	existing = frappe.db.exists("Geo User Theme", {"user": user})
	if existing:
		doc = frappe.get_doc("Geo User Theme", existing)
		doc.theme = theme
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc(
			{
				"doctype": "Geo User Theme",
				"user": user,
				"theme": theme,
			}
		)
		doc.insert(ignore_permissions=True)

	frappe.db.commit()
	return {"status": "ok", "theme": theme}
