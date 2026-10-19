from app.services.recipe_service import _can_edit, _copy_from_snapshot, _is_visible, _snapshot


def test_builtin_recipe_is_visible_to_anyone():
    row = {"is_builtin": True, "owner_id": None, "visibility": "public"}
    assert _is_visible(row, "user-a") is True


def test_private_recipe_visible_only_to_owner():
    row = {"is_builtin": False, "owner_id": "user-a", "visibility": "private"}
    assert _is_visible(row, "user-a") is True
    assert _is_visible(row, "user-b") is False


def test_public_recipe_visible_to_everyone():
    row = {"is_builtin": False, "owner_id": "user-a", "visibility": "public"}
    assert _is_visible(row, "user-a") is True
    assert _is_visible(row, "user-b") is True


def test_builtin_recipe_cannot_be_edited_by_anyone():
    row = {"is_builtin": True, "owner_id": None, "visibility": "public"}
    assert _can_edit(row, "user-a") is False


def test_only_owner_can_edit_own_recipe_even_if_public():
    row = {"is_builtin": False, "owner_id": "user-a", "visibility": "public"}
    assert _can_edit(row, "user-a") is True
    assert _can_edit(row, "user-b") is False


def test_snapshot_keeps_only_content_fields():
    row = {
        "id": 7,
        "owner_id": "user-a",
        "visibility": "private",
        "is_builtin": False,
        "title": "Tapioca",
        "description": None,
        "meal_types": ["Café da manhã"],
        "ingredients": [{"food_name": "Tapioca (goma)", "quantity": 50, "unit": "g"}],
        "instructions": ["Espalhe a goma."],
        "prep_time_min": 8,
        "servings": 1,
    }
    snap = _snapshot(row)
    assert snap["title"] == "Tapioca"
    assert snap["ingredients"] == row["ingredients"]
    assert "owner_id" not in snap
    assert "visibility" not in snap
    assert "id" not in snap


def test_copy_from_snapshot_is_private_and_owned_by_receiver():
    snap = {
        "title": "Tapioca",
        "description": "Rápida",
        "meal_types": ["Café da manhã"],
        "ingredients": [{"food_name": "Tapioca (goma)", "quantity": 50, "unit": "g"}],
        "instructions": ["Espalhe a goma."],
        "prep_time_min": 8,
        "servings": 2,
    }
    copy = _copy_from_snapshot(snap, "user-b", 42)
    assert copy["owner_id"] == "user-b"
    assert copy["visibility"] == "private"
    assert copy["is_builtin"] is False
    assert copy["source_message_id"] == 42
    assert copy["title"] == "Tapioca"
    assert copy["servings"] == 2


def test_copy_from_incomplete_snapshot_uses_safe_defaults():
    copy = _copy_from_snapshot({}, "user-b", 1)
    assert copy["title"] == "Receita"
    assert copy["ingredients"] == []
    assert copy["servings"] == 1
    assert copy["prep_time_min"] == 0
