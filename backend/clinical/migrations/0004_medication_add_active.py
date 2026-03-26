from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinical", "0003_bodypart_remove_symptom_code_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="medication",
            name="active",
            field=models.BooleanField(default=True),
        ),
    ]
