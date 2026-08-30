from app.services.preset_service import _can_edit, _is_visible


def test_builtin_preset_is_visible_to_anyone():
    row = {"is_builtin": True, "nutritionist_id": None, "visibility": "private"}
    assert _is_visible(row, "user-a") is True


def test_private_preset_visible_only_to_owner():
    row = {"is_builtin": False, "nutritionist_id": "user-a", "visibility": "private"}
    assert _is_visible(row, "user-a") is True
    assert _is_visible(row, "user-b") is False


def test_public_preset_visible_to_everyone():
    row = {"is_builtin": False, "nutritionist_id": "user-a", "visibility": "public"}
    assert _is_visible(row, "user-a") is True
    assert _is_visible(row, "user-b") is True


def test_builtin_preset_cannot_be_edited_by_anyone():
    row = {"is_builtin": True, "nutritionist_id": None, "visibility": "private"}
    assert _can_edit(row, "user-a") is False


def test_owner_can_edit_own_custom_preset():
    row = {"is_builtin": False, "nutritionist_id": "user-a", "visibility": "public"}
    assert _can_edit(row, "user-a") is True
    assert _can_edit(row, "user-b") is False
