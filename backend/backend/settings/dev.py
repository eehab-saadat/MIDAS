from .base import *

# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

# TODO: change the sqlite file location
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
