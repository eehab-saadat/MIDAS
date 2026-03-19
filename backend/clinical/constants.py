import enum


class SnomedEntityType(enum.Enum):
    FINDING = "finding"
    PROCEDURE = "procedure"
    BODY_STRUCTURE = "body_structure"
    OTHER = "other"


class BodyPart(enum.Enum):
    HEAD = "Head & Face"
    EYES = "Eyes"
    EARS = "Ears, Nose & Throat (ENT)"
    NECK = "Neck"
    CHEST = "Chest / Thorax"
    ABDOMEN = "Abdomen"
    PELVIS = "Pelvis & Groin"
    BACK = "Back & Spine"
    SHOULDERS = "Shoulders & Arms"
    HANDS = "Hands & Wrists"
    LEGS = "Legs & Thighs"
    FEET = "Feet & Ankles"
    SKIN = "Skin / Systemic"
