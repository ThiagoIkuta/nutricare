def _is_visible(preset_row: dict, user_id: str) -> bool:
    if preset_row.get("is_builtin"):
        return True
    if preset_row.get("nutritionist_id") == user_id:
        return True
    return preset_row.get("visibility") == "public"


def _can_edit(preset_row: dict, user_id: str) -> bool:
    if preset_row.get("is_builtin"):
        return False
    return preset_row.get("nutritionist_id") == user_id
