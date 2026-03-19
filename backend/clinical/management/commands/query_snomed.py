from clinical.models import SnomedEntity
from django.db.models import QuerySet

# Check if they exist
results = SnomedEntity.objects.filter(
    snomed_cid__in=["75100008", "233985008", "75878002"]
)
print(f"Found {results.count()} matching entities")
for entity in results:
    print(f"CID: {entity.snomed_cid!r}, Term: {entity.fsn}, Type: {entity.entity_type}")

# Also check what the first 3 unmapped findings actually are
first_three: QuerySet[SnomedEntity] = SnomedEntity.objects.filter(
    body_parts__isnull=True
)[:3]

print("\nFirst 3 unmapped findings:")
for entity in first_three:
    print(
        f"CID: {entity.snomed_cid!r} (type: {type(entity.snomed_cid)}), : {entity.fsn}"
    )
