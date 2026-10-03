# A Scene's Motion family is shared; its distribution across Roles is a separate axis

One Motion value (`slamLeft`, `spinSlam`) decides the direction, travel and ease for every
Element in the Scene, so the board reads as a single gesture. How much of that family each Role
takes is a second, independent axis. The obvious alternative is a fully independent motion per
Element — the headline sliding while the product scales while the badge pops — and it was
rejected because a Scene with four unrelated gestures has no gesture at all: the eye cannot tell
what the board is doing or where to look first.

The cost is that no Banner can give one Role a movement the family does not contain. A badge can
pop harder, but it cannot pop *instead*.
