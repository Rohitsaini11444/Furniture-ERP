import os
import sys
import uuid

# Setup Django environment if running as standalone script
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    import django
    django.setup()

from erp.models import Finish

FINISHING_DATA = [
    {
        "id": "d12bfd00-c2af-469a-93e5-2f0bcc6dcdb8",
        "name": "Acacia Wood - Chestnut",
        "finish_code": "PE-1",
        "color": "Chestnut",
        "wood_type": "Acacia Wood",
    },
    {
        "id": "f062de6d-a62d-4a6c-b571-1fda97883442",
        "name": "Acacia Wood - Natural",
        "finish_code": "PE-2",
        "color": "Natural",
        "wood_type": "Acacia Wood",
    },
    {
        "id": "03095d80-0702-4560-9ab7-10352709bd8a",
        "name": "Acacia Wood - Oxy Natural",
        "finish_code": "PE-03",
        "color": "Oxy Natural",
        "wood_type": "Acacia Wood",
    },
    {
        "id": "0d4a303e-62dd-487d-9e0f-259c3b0919f4",
        "name": "Acacia Wood - S2 Finish",
        "finish_code": "PE-04",
        "color": "S2 Finish",
        "wood_type": "Acacia Wood",
    },
    {
        "id": "f41de32e-573c-41d9-969d-21b1df6b4164",
        "name": "Acacia Wood - Sand Blast Washed Walnut",
        "finish_code": "PE-05",
        "color": "Sand Blast Washed Walnut",
        "wood_type": "Acacia Wood",
    },
    {
        "id": "01d248ad-daff-437e-8dd1-28cfb6367ce0",
        "name": "Acacia Wood - Washed Walnut 1",
        "finish_code": "PE-06",
        "color": "Washed Walnut 1",
        "wood_type": "Acacia Wood",
    },
    {
        "id": "bb9a1fef-d53d-4279-a9a9-0eec2c07ea5c",
        "name": "Acacia Wood - Washed Walnut 2",
        "finish_code": "PE-07",
        "color": "Washed Walnut 2",
        "wood_type": "Acacia Wood",
    },
    {
        "id": "f8621465-dcdc-4e58-8433-d733df99c9a1",
        "name": "Acacia Woood - JJ Walnut",
        "finish_code": "PE-08",
        "color": "JJ Walnut",
        "wood_type": "Acacia Wood",
    },
    {
        "id": "33954e26-8391-42b8-b506-be55b18b0fdb",
        "name": "Mango Rough Wood - Light Chestnut",
        "finish_code": "PE-09",
        "color": "Light Chestnut",
        "wood_type": "Mango Wood",
    },
    {
        "id": "8e92d7d6-a6e6-455d-8be7-645464cd29ab",
        "name": "Mango Rough Wood - TC Natural Oak",
        "finish_code": "PE-10",
        "color": "TC Natural Oak",
        "wood_type": "Mango Wood",
    },
    {
        "id": "bf74adb6-1362-434e-960b-4268107cb46a",
        "name": "Mango Wood - Chestnut 1",
        "finish_code": "PE-11",
        "color": "Chestnut 1",
        "wood_type": "Mango Wood",
    },
    {
        "id": "2e82d2d7-940d-45f5-8a40-112ac00c6200",
        "name": "Mango Wood - Chestnut 2",
        "finish_code": "PE-12",
        "color": "Chestnut 2",
        "wood_type": "Mango Wood",
    },
    {
        "id": "48ba73ba-a731-409d-9aff-2e5c617cb701",
        "name": "Mango Wood - Dark Pecan",
        "finish_code": "PE-13",
        "color": "Dark Pecan",
        "wood_type": "Mango Wood",
    },
    {
        "id": "07cb6116-9fb9-4036-aa24-1c83bc397ff1",
        "name": "Mango Wood - Distressed Salvage",
        "finish_code": "PE-14",
        "color": "Distressed Salvage",
        "wood_type": "Mango Wood",
    },
    {
        "id": "92a5523e-93d5-4580-8663-4c2b9d21dc3e",
        "name": "Mango Wood - Grey Antique",
        "finish_code": "PE-15",
        "color": "Grey Antique",
        "wood_type": "Mango Wood",
    },
    {
        "id": "e0c9f4cb-7783-4fda-a3c9-1a994565bd2d",
        "name": "Mango Wood - JJ Walnut (Dark Walnut)",
        "finish_code": "PE-16",
        "color": "JJ Walnut (Dark Walnut)",
        "wood_type": "Mango Wood",
    },
    {
        "id": "e8b44962-3ae9-4a21-967b-adcd7580b966",
        "name": "Mango Wood - Light French Grey (LFG)",
        "finish_code": "PE-17",
        "color": "Light French Grey (LFG)",
        "wood_type": "Mango Wood",
    },
    {
        "id": "bd75df72-ccfb-4e12-80c1-2da959b794c6",
        "name": "Mango Wood - MCM Walnut",
        "finish_code": "PE-18",
        "color": "MCM Walnut",
        "wood_type": "Mango Wood",
    },
]


def seed_finishes(stdout_write=None):
    """
    Seeds the Finish catalog data into the database.
    - Matches by finish_code, id, or case-insensitive name.
    - Updates attributes if found; creates new record if not found.
    - DOES NOT touch or overwrite the image field (images can be added manually).
    """
    def log(msg):
        if stdout_write:
            stdout_write(msg)
        else:
            try:
                print(msg)
            except UnicodeEncodeError:
                print(msg.encode('ascii', errors='replace').decode('ascii'))

    log("=" * 60)
    log("[SEED] Seeding Finishing Catalog Data (Pinkcity Enterprises)")
    log("=" * 60)

    created_count = 0
    updated_count = 0

    for item in FINISHING_DATA:
        code = item["finish_code"]
        name = item["name"]
        color = item["color"]
        wood_type = item["wood_type"]
        raw_id = item["id"]

        # 1. Try to find existing record by finish_code
        finish_obj = None
        if code:
            finish_obj = Finish.objects.filter(finish_code=code).first()
            if not finish_obj:
                # Also check normalized zero-padded or non-zero-padded variations (e.g. PE-1 vs PE-01)
                if code.startswith("PE-"):
                    num_part = code[3:]
                    if num_part.isdigit():
                        alt_code = f"PE-{int(num_part)}" if num_part.startswith("0") else f"PE-{int(num_part):02d}"
                        finish_obj = Finish.objects.filter(finish_code=alt_code).first()

        # 2. Try to find by UUID id
        if not finish_obj and raw_id:
            try:
                finish_obj = Finish.objects.filter(id=uuid.UUID(raw_id)).first()
            except (ValueError, TypeError):
                pass

        # 3. Try to find by exact name (case-insensitive)
        if not finish_obj and name:
            finish_obj = Finish.objects.filter(name__iexact=name).first()

        if finish_obj:
            # Update fields, but NEVER modify existing image
            finish_obj.name = name
            finish_obj.finish_code = code
            finish_obj.color = color
            finish_obj.wood_type = wood_type
            finish_obj.save(update_fields=['name', 'finish_code', 'color', 'wood_type', 'updated_at'])
            updated_count += 1
            log(f"  [UPDATED] {code} - {name} ({wood_type} | {color})")
        else:
            # Create new record without touching the image field
            target_id = uuid.UUID(raw_id) if raw_id else uuid.uuid4()
            Finish.objects.create(
                id=target_id,
                name=name,
                finish_code=code,
                color=color,
                wood_type=wood_type,
            )
            created_count += 1
            log(f"  [CREATED] {code} - {name} ({wood_type} | {color})")

    log("=" * 60)
    log(f"[SUCCESS] Seeding Complete! Total: {len(FINISHING_DATA)} | Created: {created_count} | Updated: {updated_count}")
    log("[INFO] Image fields were NOT touched. You can upload images manually via the UI.")
    log("=" * 60)
    return {"total": len(FINISHING_DATA), "created": created_count, "updated": updated_count}


if __name__ == '__main__':
    seed_finishes()
