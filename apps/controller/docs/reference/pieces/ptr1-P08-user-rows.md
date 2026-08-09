# ptr1 — P08 — the three `ng-repeat` user rows, decoded cell by cell

> ## ⚠️ LIVE MEMBER PII IS RECORDED IN THIS FILE
> Rows 1 and 2 contain **real member data** from the live capture: full names, e-mail addresses, gravatar
> MD5 hashes (which are reversible identifiers derived from the e-mail address) and a real last-login
> timestamp. They are recorded here **verbatim, as evidence only**. They must **NEVER** be hard-coded into
> the rebuild, a fixture, a seed script, a test snapshot or a screenshot baseline. The rebuild renders
> `xrefs` from the real API or shows an explicit honest-pending state — nothing in between.

## 1. Purpose

This piece decodes the three `<tr ng-repeat="user in xrefs  ">` rows in the users table `<tbody>` on the
**Manage Room** admin page (room 3625) — 176 nodes per row, 528 records in total — cell by cell, attribute
by attribute, with resolved absolute computed styles. It also isolates the single repeating template that
produces all three rows and states exactly which conditional branches differ between row 0 (Owner),
row 1 (Participant) and row 2 (Admin).

## 2. Path anchors + record counts

| Row | Path anchor | Records | `#index` range |
|---|---|---|---|
| Row 0 | `r.0.1.1.0.1.3.1.0.0.3.1.0` | **176** | #467, #1315–#1319, #1539–#1570, #1672–#1679, #1743–#1757, #1811–#1825, #1856–#1899, #1988–#2012, #2063–#2093 |
| Row 1 | `r.0.1.1.0.1.3.1.0.0.3.1.1` | **176** | #468, #1320–#1324, #1571–#1602, #1680–#1687, #1758–#1772, #1826–#1840, #1900–#1943, #2013–#2037, #2094–#2124 |
| Row 2 | `r.0.1.1.0.1.3.1.0.0.3.1.2` | **176** | #469, #1325–#1329, #1603–#1634, #1688–#1695, #1773–#1787, #1841–#1855, #1944–#1987, #2038–#2062, #2125–#2155 |
| **Total** | | **528** | |

Verification (run in `/tmp/ptr-decode/ptr1/caps/00-baseline-room`):

```
for f in nodes-*.txt; do awk -v RS='' -v ORS='\n\n' \
  '/path=r\.0\.1\.1\.0\.1\.3\.1\.0\.0\.3\.1\.0([. ]|$)/' $f; done | grep -c '^#'   # => 176
# same for …3.1.1 and …3.1.2  => 176, 176
```

**Method note.** The three rows are byte-identical in the dump apart from a small, enumerable set of
differences. I proved this by normalising the `#index` and the row ordinal out of each extract and running
a full `diff -u` in both directions (`row0 ↔ row1` = 264 diff lines, `row1 ↔ row2` = the block reproduced
in §7.3). **Every** differing line from those two diffs is reported in §7; everything not listed there is
identical across all three rows, verbatim. Nothing was sampled or skimmed.

### Parent chain

`#137 fieldset.ng-scope` → `#174 table.table.table-striped ` → `#205 tbody` (x=37 y=549.5 w=1768 h=165.266)
→ these three `<tr>`.

---

## 3. The repeat itself

```
attr ng-repeat = "user in xrefs  "        (two trailing spaces, verbatim)
attr class     = "ng-scope"
```

* **Collection:** `xrefs` on the enclosing scope. It produced exactly **3** items at capture time.
* **No `track by`**, no `orderBy`, no `filter` in the expression.
* Each row reads `user.role`, `user.email`, `user.userName`, `user._id`, `user.inviteStatus`,
  `user.nonPresenter`, `user.hasMic`, `user.hasCam`, `user.hasScreen`, `user.hasAdminChat`,
  `user.canEditNotes`, `user.denyArchivesAccess`, `user.discordUserId`, `user.isFreeTrial`,
  `user.mobilePairCode`, `user.phone`, `user.pw`, `user.hideUserCount`, `user.hidePersInfo`,
  `user.inactive`, `user.restrictPMUser`, `user.note`, `user.alerterAppTokens`, and `$index`
  (all cited from `ng-show` / `ng-hide` / `ng-click` / `ng-checked` attributes listed in §5).
* The enclosing `<table>` carries `ng-init="showPins=true;"` (P07), which is the `showPins` referenced by
  the row-level `ng-show="showPins && user.mobilePairCode"`.

---

## 4. Node table — the 176-node row template (all three rows)

`path` is the suffix after `r.0.1.1.0.1.3.1.0.0.3.1.{0|1|2}`. `R0/R1/R2` = renders in that row
(`✓` = `display` ≠ none **and** rect w>0 **and** h>0; `·` = does not paint).

| # | path | tag | #r0 | #r1 | #r2 | classes / key attrs | R0 | R1 | R2 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | *(row root)* | tr | 467 | 468 | 469 | `ng-scope`, `ng-repeat="user in xrefs  "` | ✓ | ✓ | ✓ |
| 2 | `.0` | td | 1315 | 1320 | 1325 | `ng-binding` — column `#` | ✓ | ✓ | ✓ |
| 3 | `.1` | td | 1316 | 1321 | 1326 | `ng-binding` — column `Name / Email` | ✓ | ✓ | ✓ |
| 4 | `.2` | td | 1317 | 1322 | 1327 | `ng-binding` — column `Last Login/Notes` | ✓ | ✓ | ✓ |
| 5 | `.3` | td | 1318 | 1323 | 1328 | *(no attrs)* — column `Role / Status` | ✓ | ✓ | ✓ |
| 6 | `.4` | td | 1319 | 1324 | 1329 | *(no attrs)* — column `Actions` | ✓ | ✓ | ✓ |
| 7 | `.1.0` | input | 1539 | 1571 | 1603 | `type=checkbox`, `ng-show="user.role!==0"` | · | ✓ | ✓ |
| 8 | `.1.1` | i | 1540 | 1572 | 1604 | `fa fa-folder-o fa-2x ng-hide`, `ng-show="false"` | · | · | · |
| 9 | `.1.2` | i | 1541 | 1573 | 1605 | `fa fa-mobile fa-2x ng-hide`, `ng-show="false"` | · | · | · |
| 10 | `.1.3` | i | 1542 | 1574 | 1606 | `fa fa-mobile ng-hide`, `ng-show="false"` | · | · | · |
| 11 | `.1.4` | i | 1543 | 1575 | 1607 | `fa fa-mobile ng-hide`, `ng-show="false"`, `style="color: red;"` | · | · | · |
| 12 | `.1.5` | i | 1544 | 1576 | 1608 | `fa fa-microphone ng-hide`, `ng-show="user.hasMic"` | · | · | · |
| 13 | `.1.6` | i | 1545 | 1577 | 1609 | `fa fa-video-camera ng-hide`, `ng-show="user.hasCam"` | · | · | · |
| 14 | `.1.7` | i | 1546 | 1578 | 1610 | `fa fa-desktop ng-hide`, `ng-show="user.hasScreen"` | · | · | · |
| 15 | `.1.8` | i | 1547 | 1579 | 1611 | `fa fa-comment-o ng-hide`, `ng-show="user.hasAdminChat"` | · | · | · |
| 16 | `.1.9` | i | 1548 | 1580 | 1612 | `fa fa-pencil-square-o ng-hide`, `ng-show="user.canEditNotes"` | · | · | · |
| 17 | `.1.10` | i | 1549 | 1581 | 1613 | `fa fa-hdd-o ng-hide`, `ng-show="user.denyArchivesAccess"`, `title="Denied Archives Access"`, `style="color: red;"` | · | · | · |
| 18 | `.1.11` | **img** | 1550 | 1582 | 1614 | `thumb24 `, `gravatar-src-once="user.email "`, `style="margin-right:5px "` | ✓ | ✓ | ✓ |
| 19 | `.1.12` | div | 1551 | 1583 | 1615 | `ng-binding ng-hide`, `ng-show="user.discordUserId"` | · | · | · |
| 20 | `.1.13` | span | 1552 | 1584 | 1616 | `badge badge-danger-chat ng-hide`, `ng-show="user.isFreeTrial"` | · | · | · |
| 21 | `.1.14` | **br** | 1553 | 1585 | 1617 | *(no attrs)* — line break between name and e-mail | ✓ | ✓ | ✓ |
| 22 | `.1.15` | span | 1554 | 1586 | 1618 | `ng-binding ng-hide`, `ng-show="showPins && user.mobilePairCode"` | · | · | · |
| 23 | `.1.16` | span | 1555 | 1587 | 1619 | `ng-binding ng-hide`, `ng-show="user.phone"` | · | · | · |
| 24 | `.1.17` | span | 1556 | 1588 | 1620 | `ng-show="user.pw"` | · | · | **✓** |
| 25 | `.1.18` | span | 1557 | 1589 | 1621 | `badge badge-danger ng-hide`, `ng-show="user.hideUserCount"` | · | · | · |
| 26 | `.1.19` | span | 1558 | 1590 | 1622 | `badge badge-danger ng-hide`, `ng-show="user.hidePersInfo"` | · | · | · |
| 27 | `.2.0` | span | 1559 | 1591 | 1623 | `ng-hide`, `ng-show="user.inactive"`, `style="color: red;"` | · | · | · |
| 28 | `.2.1` | span | 1560 | 1592 | 1624 | `ng-hide`, `ng-show="user.restrictPMUser"`, `style="color: red;"` | · | · | · |
| 29 | `.2.2` | div | 1561 | 1593 | 1625 | `ng-binding ng-hide`, `ng-show="user.note"`, `style="border: 1px solid #A0A0A0; padding: 5px; "` | · | · | · |
| 30 | `.3.0` | button | 1562 | 1594 | 1626 | `btn btn-small btn-warning ng-hide`, `ng-show="user.inviteStatus=='pending' "` | · | · | · |
| 31 | `.3.1` | span | 1563 | 1595 | 1627 | `ng-show="user.role==2 "` → **Participant** | · | **✓** | · |
| 32 | `.3.2` | span | 1564 | 1596 | 1628 | `ng-show="user.role==0 "` → **Owner** | **✓** | · | · |
| 33 | `.3.3` | span | 1565 | 1597 | 1629 | `ng-show="user.role==1 && !user.nonPresenter"` → Presenter | · | · | · |
| 34 | `.3.4` | span | 1566 | 1598 | 1630 | `ng-show="user.role==1 && user.nonPresenter"` → **Admin** | · | · | **✓** |
| 35 | `.3.5` | span | 1567 | 1599 | 1631 | `ng-binding`, `ng-hide="user.role==0"` → the `/ …` separator | · | **✓** | **✓** |
| 36 | `.3.6` | span | 1568 | 1600 | 1632 | `ng-show="user.role==3 "`, `style="color: red;"` → CHAT MUTED | · | · | · |
| 37 | `.3.7` | span | 1569 | 1601 | 1633 | `ng-show="user.role==4 "`, `style="color: red;"` → BANNED | · | · | · |
| 38 | `.4.0` | div | 1570 | 1602 | 1634 | `btn-group mb-sm mr`, `dropdown="dropdown"`, `ng-hide="user.role==0"` | · | **✓** | **✓** |
| 39 | `.1.15.0` | i | 1672 | 1680 | 1688 | `fa fa-mobile` | · | · | · |
| 40 | `.1.16.0` | i | 1673 | 1681 | 1689 | `fa fa-phone` | · | · | · |
| 41 | `.1.17.0` | i | 1674 | 1682 | 1690 | `fa fa-lock` | · | · | **✓** |
| 42 | `.2.1.0` | br | 1675 | 1683 | 1691 | *(no attrs)* | · | · | · |
| 43 | `.2.1.1` | i | 1676 | 1684 | 1692 | `fa fa-comment-o` | · | · | · |
| 44 | `.2.2.0` | br | 1677 | 1685 | 1693 | *(no attrs)* | · | · | · |
| 45 | `.4.0.0` | button | 1678 | 1686 | 1694 | `btn dropdown-toggle btn-primary`, `type=button`, `dropdown-toggle=""`, `ng-disabled="disabled"` | · | **✓** | **✓** |
| 46 | `.4.0.1` | ul | 1679 | 1687 | 1695 | `dropdown-menu dropdown-menu-right`, `role=menu` | · | · | · |
| 47 | `.4.0.0.0` | span | 1743 | 1758 | 1773 | `caret` | · | **✓** | **✓** |
| 48 | `.4.0.0.1` | span | 1744 | 1759 | 1774 | *(no attrs)* — ripple host | · | zero-width | zero-width |
| 49 | `.4.0.1.0` | li | 1745 | 1760 | 1775 | `dropdown-submenu`, `ng-class="{open: submenuOpen.permissions}"` | · | · | · |
| 50 | `.4.0.1.1` | li | 1746 | 1761 | 1776 | `dropdown-submenu`, `ng-class="{open: submenuOpen.granular}"` | · | · | · |
| 51 | `.4.0.1.2` | li | 1747 | 1762 | 1777 | `dropdown-submenu`, `ng-class="{open: submenuOpen.app}"` | · | · | · |
| 52 | `.4.0.1.3` | li | 1748 | 1763 | 1778 | `dropdown-submenu`, `ng-class="{open: submenuOpen.badges}"` | · | · | · |
| 53 | `.4.0.1.4` | li | 1749 | 1764 | 1779 | `divider` | · | · | · |
| 54 | `.4.0.1.5` | li | 1750 | 1765 | 1780 | *(none)* | · | · | · |
| 55 | `.4.0.1.6` | li | 1751 | 1766 | 1781 | *(none)* | · | · | · |
| 56 | `.4.0.1.7` | li | 1752 | 1767 | 1782 | *(none)* | · | · | · |
| 57 | `.4.0.1.8` | li | 1753 | 1768 | 1783 | `divider` | · | · | · |
| 58 | `.4.0.1.9` | li | 1754 | 1769 | 1784 | *(none)* | · | · | · |
| 59 | `.4.0.1.10` | li | 1755 | 1770 | 1785 | *(none)* | · | · | · |
| 60 | `.4.0.1.11` | li | 1756 | 1771 | 1786 | `divider` | · | · | · |
| 61 | `.4.0.1.12` | li | 1757 | 1772 | 1787 | *(none)* | · | · | · |
| 62 | `.4.0.0.1.0` | span | 1811 | 1826 | 1841 | `style="width: 107px; height: 107px; left: -10.6719px; top: -42.5px;"` | · | zero-width | zero-width |
| 63 | `.4.0.1.0.0` | a | 1812 | 1827 | 1842 | `href=""` — **Permissions** | · | · | · |
| 64 | `.4.0.1.0.1` | ul | 1813 | 1828 | 1843 | `dropdown-menu` | · | · | · |
| 65 | `.4.0.1.1.0` | a | 1814 | 1829 | 1844 | `href=""` — **Granular Perms** | · | · | · |
| 66 | `.4.0.1.1.1` | ul | 1815 | 1830 | 1845 | `dropdown-menu` | · | · | · |
| 67 | `.4.0.1.2.0` | a | 1816 | 1831 | 1846 | `href=""` — **App and Notifications** | · | · | · |
| 68 | `.4.0.1.2.1` | ul | 1817 | 1832 | 1847 | `dropdown-menu` | · | · | · |
| 69 | `.4.0.1.3.0` | a | 1818 | 1833 | 1848 | `href=""` — **Badges** | · | · | · |
| 70 | `.4.0.1.3.1` | ul | 1819 | 1834 | 1849 | `dropdown-menu` — **has NO `<li>` children in the capture** | · | · | · |
| 71 | `.4.0.1.5.0` | a | 1820 | 1835 | 1850 | `href=""` — Set Note | · | · | · |
| 72 | `.4.0.1.6.0` | a | 1821 | 1836 | 1851 | `href=""` — Edit Username | · | · | · |
| 73 | `.4.0.1.7.0` | a | 1822 | 1837 | 1852 | `href=""` — Remove User | · | · | · |
| 74 | `.4.0.1.9.0` | a | 1823 | 1838 | 1853 | `href=""` — Set/Change Password | · | · | · |
| 75 | `.4.0.1.10.0` | a | 1824 | 1839 | 1854 | `href=""` — Resend Welcome Email | · | · | · |
| 76 | `.4.0.1.12.0` | a | 1825 | 1840 | 1855 | `href=""` — Pause / Pending | · | · | · |
| 77 | `.4.0.1.0.0.0` | i | 1856 | 1900 | 1944 | `fa fa-shield` | · | · | · |
| 78 | `.4.0.1.0.0.1` | i | 1857 | 1901 | 1945 | `fa fa-caret-right pull-right` | · | · | · |
| 79–87 | `.4.0.1.0.1.{0..8}` | li | 1858–1866 | 1902–1910 | 1946–1954 | `.6` is `divider`; rest have no attrs | · | · | · |
| 88 | `.4.0.1.1.0.0` | i | 1867 | 1911 | 1955 | `fa fa-sliders` | · | · | · |
| 89 | `.4.0.1.1.0.1` | i | 1868 | 1912 | 1956 | `fa fa-caret-right pull-right` | · | · | · |
| 90 | `.4.0.1.1.1.0` | li | 1869 | 1913 | 1957 | `ng-show="user.role !== 1"` — **hidden in row 2 only** | · | · | · |
| 91 | `.4.0.1.1.1.1` | li | 1870 | 1914 | 1958 | `divider` | · | · | · |
| 92–93 | `.4.0.1.1.1.{2,3}` | li | 1871–1872 | 1915–1916 | 1959–1960 | *(none)* | · | · | · |
| 94 | `.4.0.1.1.1.4` | li | 1873 | 1917 | 1961 | `ng-show="!user.denyArchivesAccess"` | · | · | · |
| 95 | `.4.0.1.1.1.5` | li | 1874 | 1918 | 1962 | `ng-show="user.denyArchivesAccess"` `class="ng-hide"` | · | · | · |
| 96–97 | `.4.0.1.1.1.{6,7}` | li | 1875–1876 | 1919–1920 | 1963–1964 | *(none)* | · | · | · |
| 98 | `.4.0.1.1.1.8` | li | 1877 | 1921 | 1965 | `divider` | · | · | · |
| 99–100 | `.4.0.1.1.1.{9,10}` | li | 1878–1879 | 1922–1923 | 1966–1967 | *(none)* | · | · | · |
| 101 | `.4.0.1.1.1.11` | li | 1880 | 1924 | 1968 | `divider` | · | · | · |
| 102 | `.4.0.1.2.0.0` | i | 1881 | 1925 | 1969 | `fa fa-mobile` | · | · | · |
| 103 | `.4.0.1.2.0.1` | i | 1882 | 1926 | 1970 | `fa fa-caret-right pull-right` | · | · | · |
| 104–112 | `.4.0.1.2.1.{0..8}` | li | 1883–1891 | 1927–1935 | 1971–1979 | `.3` is `divider`; rest have no attrs | · | · | · |
| 113 | `.4.0.1.3.0.0` | i | 1892 | 1936 | 1980 | `fa fa-certificate` | · | · | · |
| 114 | `.4.0.1.3.0.1` | i | 1893 | 1937 | 1981 | `fa fa-caret-right pull-right` | · | · | · |
| 115 | `.4.0.1.5.0.0` | i | 1894 | 1938 | 1982 | `fa fa-pencil-square-o` | · | · | · |
| 116 | `.4.0.1.6.0.0` | i | 1895 | 1939 | 1983 | `fa fa-edit` | · | · | · |
| 117 | `.4.0.1.7.0.0` | i | 1896 | 1940 | 1984 | `fa fa-trash` | · | · | · |
| 118 | `.4.0.1.9.0.0` | i | 1897 | 1941 | 1985 | `fa fa-lock` | · | · | · |
| 119 | `.4.0.1.10.0.0` | i | 1898 | 1942 | 1986 | `fa fa-envelope` | · | · | · |
| 120 | `.4.0.1.12.0.0` | i | 1899 | 1943 | 1987 | `fa fa-pause` | · | · | · |
| 121–128 | `.4.0.1.0.1.{0,1,2,3,4,5,7,8}.0` | a | 1988–1995 | 2013–2020 | 2038–2045 | Permissions-submenu anchors (see §6) | · | · | · |
| 129–137 | `.4.0.1.1.1.{0,2,3,4,5,6,7,9,10}.0` | a | 1996–2004 | 2021–2029 | 2046–2054 | Granular-Perms anchors (see §6) | · | · | · |
| 138–145 | `.4.0.1.2.1.{0,1,2,4,5,6,7,8}.0` | a | 2005–2012 | 2030–2037 | 2055–2062 | App-and-Notifications anchors (see §6) | · | · | · |
| 146–176 | *(31 `<i>` icons inside the submenu anchors)* | i | 2063–2093 | 2094–2124 | 2125–2155 | see §6 for the exact class per path | · | · | · |

**No node anywhere in P08 carries an `id` attribute** (verified by grep over all 528 records).
The only `data-*` attributes are `data-toggle="modal"` + `data-target="#permissionsModal"` on
`.4.0.1.1.1.0.0`. There is **no `colspan`/`rowspan`** anywhere. The only `src` is the gravatar `img`.

### 4.1 Every box that actually paints — exact rects

| row | node | path | rect x | y | w | h |
|---|---|---|---|---|---|---|
| **0** | tr | *(root)* | 37 | 549.5 | 1768 | 41 |
| 0 | td `#` | `.0` | 37 | 549.5 | 59.2656 | 41 |
| 0 | td Name/Email | `.1` | 96.3 | 549.5 | 722.703 | 41 |
| 0 | td Last Login | `.2` | 819 | 549.5 | 386.406 | 41 |
| 0 | td Role/Status | `.3` | 1205.4 | 549.5 | 313.789 | 41 |
| 0 | td Actions | `.4` | 1519.2 | 549.5 | 285.836 | 41 |
| 0 | img.thumb24 | `.1.11` | **104.3** | 558 | 24 | 24 |
| 0 | br | `.1.14` | **133.3** | 560.1 | 0 | 16.5 |
| 0 | span "Owner" | `.3.2` | 1213.4 | 559.5 | 41.2 | 16.5 |
| **1** | tr | *(root)* | 37 | 590.5 | 1768 | 62.3828 |
| 1 | td `#` | `.0` | 37 | 590.5 | 59.2656 | 62.3828 |
| 1 | td Name/Email | `.1` | 96.3 | 590.5 | 722.703 | 62.3828 |
| 1 | td Last Login | `.2` | 819 | 590.5 | 386.406 | 62.3828 |
| 1 | td Role/Status | `.3` | 1205.4 | 590.5 | 313.789 | 62.3828 |
| 1 | td Actions | `.4` | 1519.2 | 590.5 | 285.836 | 62.3828 |
| 1 | input[checkbox] | `.1.0` | 104.3 | 603 | 13 | 13 |
| 1 | img.thumb24 | `.1.11` | **121.2** | 600.4 | 24 | 24 |
| 1 | br | `.1.14` | **224** | 602.5 | 0 | 16.5 |
| 1 | span "Participant" | `.3.1` | 1213.4 | 600.5 | 67.4 | 16.5 |
| 1 | span "/ login" | `.3.5` | 1284.7 | 600.5 | 38.6 | 16.5 |
| 1 | div.btn-group | `.4.0` | 1527.2 | 599 | 88.7188 | 34 |
| 1 | button "Actions" | `.4.0.0` | 1527.2 | 599 | 88.7188 | 34 |
| 1 | span.caret | `.4.0.0.0` | 1594.9 | 615.4 | 8 | 4 |
| 1 | span (ripple host) | `.4.0.0.1` | 1602.9 | 607.5 | **0** | 16.5 |
| 1 | span (ripple) | `.4.0.0.1.0` | 1602.9 | 607.5 | **0** | 16.5 |
| **2** | tr | *(root)* | 37 | 652.9 | 1768 | 61.8828 |
| 2 | td `#` | `.0` | 37 | 652.9 | 59.2656 | 61.8828 |
| 2 | td Name/Email | `.1` | 96.3 | 652.9 | 722.703 | 61.8828 |
| 2 | td Last Login | `.2` | 819 | 652.9 | 386.406 | 61.8828 |
| 2 | td Role/Status | `.3` | 1205.4 | 652.9 | 313.789 | 61.8828 |
| 2 | td Actions | `.4` | 1519.2 | 652.9 | 285.836 | 61.8828 |
| 2 | input[checkbox] | `.1.0` | 104.3 | 665.4 | 13 | 13 |
| 2 | img.thumb24 | `.1.11` | **121.2** | 662.8 | 24 | 24 |
| 2 | br | `.1.14` | **176.1** | 664.9 | 0 | 16.5 |
| 2 | span "PW set" | `.1.17` | 305 | 688.3 | 73.3 | 16.5 |
| 2 | i.fa.fa-lock | `.1.17.0` | 320.6 | 689.8 | 9 | 14 |
| 2 | span "Admin" | `.3.4` | 1213.4 | 662.9 | 40.2 | 16.5 |
| 2 | span "/ manual" | `.3.5` | 1257.5 | 662.9 | 54.2 | 16.5 |
| 2 | div.btn-group | `.4.0` | 1527.2 | 661.4 | 88.7188 | 34 |
| 2 | button "Actions" | `.4.0.0` | 1527.2 | 661.4 | 88.7188 | 34 |
| 2 | span.caret | `.4.0.0.0` | 1594.9 | 677.8 | 8 | 4 |
| 2 | span (ripple host) | `.4.0.0.1` | 1602.9 | 669.9 | **0** | 16.5 |
| 2 | span (ripple) | `.4.0.0.1.0` | 1602.9 | 669.9 | **0** | 16.5 |

**Row pitch (measured, replacing the prior-pass estimate):** `tr` tops are **549.5 → 590.5 → 652.9**;
heights **41 / 62.3828 / 61.8828**; sum `165.2656` = `tbody` height `165.266`. ✓
(The "y ≈ 558 → 599 → 661" figure from the earlier pass corresponds to the **gravatar image** tops
558 / 600.4 / 662.8, not to the row boxes. Both are recorded above so there is no ambiguity.)

**Internal x-consistency checks, all from the capture:**
`96.3 (td left) + 8 (padding-left) = 104.3` — row 0's img and rows 1/2's checkbox both start there. ✓
Rows 1/2: `104.3 + 13 (checkbox) + 3.9 (collapsed space) = 121.2` — the img. ✓
`121.2 + 24 (img) + 5 (margin-right) = 150.2` — where the user name starts; the `<br>` marks where it ends:
row 1 `224 − 150.2 = 73.8px` of "[OWNER_NAME]", row 2 `176.1 − 150.2 = 25.9px` of "[OWNER_SHORT_NAME]".
Row 0: `104.3 + 24 + 5 = 133.3` = its `<br>` — **zero name text.** ✓
`1519.2 + 8 = 1527.2` = the Actions `btn-group`. ✓

---

## 5. Every attribute, verbatim (identical in all three rows unless noted)

```
<tr>                     ng-repeat = "user in xrefs  "
                         class     = "ng-scope"

<td> .0                  class = "ng-binding"
<td> .1                  class = "ng-binding"
<td> .2                  class = "ng-binding"
<td> .3                  (none)
<td> .4                  (none)

.1.0  <input>   ng-show    = "user.role!==0"
                type       = "checkbox"
                name       = "checkbox"
                ng-checked = "checkedUserIds[user._id]"
                ng-click   = "getCheckedUserIds(user._id)"
                class      = "ng-hide"        <-- ROW 0 ONLY; rows 1 & 2 have NO class attribute

.1.1  <i>       ng-show="false"  class="fa fa-folder-o fa-2x ng-hide"      aria-hidden="true"
.1.2  <i>       ng-show="false"  class="fa fa-mobile fa-2x ng-hide"        aria-hidden="true"
.1.3  <i>       ng-show="false"  class="fa fa-mobile ng-hide"              aria-hidden="true"
.1.4  <i>       ng-show="false"  class="fa fa-mobile ng-hide"  style="color: red;"  aria-hidden="true"
.1.5  <i>       class="fa fa-microphone ng-hide"       ng-show="user.hasMic"           aria-hidden="true"
.1.6  <i>       class="fa fa-video-camera ng-hide"     ng-show="user.hasCam"           aria-hidden="true"
.1.7  <i>       class="fa fa-desktop ng-hide"          ng-show="user.hasScreen"        aria-hidden="true"
.1.8  <i>       class="fa fa-comment-o ng-hide"        ng-show="user.hasAdminChat"     aria-hidden="true"
.1.9  <i>       class="fa fa-pencil-square-o ng-hide"  ng-show="user.canEditNotes"     aria-hidden="true"
.1.10 <i>       class="fa fa-hdd-o ng-hide"            ng-show="user.denyArchivesAccess"
                aria-hidden="true"  title="Denied Archives Access"  style="color: red;"

.1.11 <img>     gravatar-src-once = "user.email "     <-- trailing space, verbatim
                style             = "margin-right:5px "
                class             = "thumb24 "
                src               = (ROW-DEPENDENT — see §8)

.1.12 <div>     ng-show="user.discordUserId"  class="ng-binding ng-hide"
                style="color: red; font-size: 12px; margin-left: 10px;"
.1.13 <span>    ng-show="user.isFreeTrial"    class="badge badge-danger-chat ng-hide"
                style="color: white; margin-right: 20px;"
.1.14 <br>      (none)
.1.15 <span>    ng-show="showPins && user.mobilePairCode"   class="ng-binding ng-hide"
.1.16 <span>    ng-show="user.phone"                        class="ng-binding ng-hide"
.1.17 <span>    ng-show="user.pw"    class="ng-hide"   <-- class present rows 0 & 1, ABSENT row 2
.1.18 <span>    class="badge badge-danger ng-hide"     ng-show="user.hideUserCount"
.1.19 <span>    class="badge badge-danger ng-hide"     ng-show="user.hidePersInfo"

.2.0  <span>    ng-show="user.inactive"        style="color: red;"  class="ng-hide"
.2.1  <span>    ng-show="user.restrictPMUser"  style="color: red;"  class="ng-hide"
.2.2  <div>     ng-show="user.note"  style="border: 1px solid #A0A0A0; padding: 5px; "
                class="ng-binding ng-hide"

.3.0  <button>  class    = "btn btn-small btn-warning ng-hide"
                ng-click = "approveUser(user.userName,user._id,$index,'approved')"
                ng-show  = "user.inviteStatus=='pending' "
.3.1  <span>    ng-show="user.role==2 "                       class="ng-hide" (rows 0,2 only)
.3.2  <span>    ng-show="user.role==0 "                       class="ng-hide" (rows 1,2 only)
.3.3  <span>    ng-show="user.role==1 && !user.nonPresenter"  class="ng-hide" (all rows)
.3.4  <span>    ng-show="user.role==1 && user.nonPresenter"   class="ng-hide" (rows 0,1 only)
.3.5  <span>    ng-hide="user.role==0"    class="ng-binding ng-hide" (row 0) / "ng-binding" (rows 1,2)
.3.6  <span>    ng-show="user.role==3 "   style="color: red;"  class="ng-hide"
.3.7  <span>    ng-show="user.role==4 "   style="color: red;"  class="ng-hide"

.4.0  <div>     ng-hide   = "user.role==0"
                dropdown  = "dropdown"
                class     = "btn-group mb-sm mr ng-hide" (row 0) / "btn-group mb-sm mr" (rows 1,2)
                ng-init   = "submenuOpen={permissions:false, granular:false, app:false, badges:false}"
                on-toggle = "!open && (submenuOpen={permissions:false, granular:false, app:false, badges:false})"

.1.15.0 <i>  class="fa fa-mobile"
.1.16.0 <i>  class="fa fa-phone"
.1.17.0 <i>  class="fa fa-lock"   aria-hidden="true"
.2.1.0  <br> (none)
.2.1.1  <i>  class="fa fa-comment-o"
.2.2.0  <br> (none)

.4.0.0  <button>  type="button"  ng-disabled="disabled"  dropdown-toggle=""
                  class="btn dropdown-toggle btn-primary"
                  aria-haspopup="true"  aria-expanded="false"
.4.0.1  <ul>      role="menu"  class="dropdown-menu dropdown-menu-right"
.4.0.0.0 <span>   class="caret"
.4.0.0.1 <span>   (none)
.4.0.0.1.0 <span> style="width: 107px; height: 107px; left: -10.6719px; top: -42.5px;"

.4.0.1.0  <li>  class="dropdown-submenu"  ng-class="{open: submenuOpen.permissions}"
.4.0.1.1  <li>  class="dropdown-submenu"  ng-class="{open: submenuOpen.granular}"
.4.0.1.2  <li>  class="dropdown-submenu"  ng-class="{open: submenuOpen.app}"
.4.0.1.3  <li>  class="dropdown-submenu"  ng-class="{open: submenuOpen.badges}"
.4.0.1.4  <li>  class="divider"
.4.0.1.8  <li>  class="divider"
.4.0.1.11 <li>  class="divider"
.4.0.1.{5,6,7,9,10,12} <li>  (no attributes)
```

### Every `ng-click` in the row Actions menu, verbatim

```
.4.0.1.0.0     Permissions            submenuOpen.permissions=!submenuOpen.permissions; submenuOpen.granular=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();
.4.0.1.1.0     Granular Perms         submenuOpen.granular=!submenuOpen.granular; submenuOpen.permissions=false; submenuOpen.app=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();
.4.0.1.2.0     App and Notifications  submenuOpen.app=!submenuOpen.app; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.badges=false; $event.preventDefault(); $event.stopPropagation();
.4.0.1.3.0     Badges                 submenuOpen.badges=!submenuOpen.badges; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.app=false; $event.preventDefault(); $event.stopPropagation();
.4.0.1.5.0     Set Note               setNoteUser(user._id,user.userName,$index)
.4.0.1.6.0     Edit Username          editUsername(user._id, user.userName)
.4.0.1.7.0     Remove User            deleteParticipant(user.userName,user._id,$index)
.4.0.1.9.0     Set/Change Password    setUserPW(user._id,user.userName,$index)
.4.0.1.10.0    Resend Welcome Email   sendWelcomeEmail(user._id,user.userName,$index)
.4.0.1.12.0    Pause / Pending        approveUser(user.userName,user._id,$index,'pending')

.4.0.1.0.1.0.0 Make Presenter         updateUser(1,user._id,user.userName,$index)
.4.0.1.0.1.1.0 Make Admin             updateUser(5,user._id,user.userName,$index)
.4.0.1.0.1.2.0 Make Participant       updateUser(2,user._id,user.userName,$index)
.4.0.1.0.1.3.0 Make Trial             updateUser(6,user._id,user.userName,$index)
.4.0.1.0.1.4.0 MUTE Participant       updateUser(3,user._id,user.userName,$index)
.4.0.1.0.1.5.0 BAN                    updateUser(4,user._id,user.userName,$index)
.4.0.1.0.1.7.0 Unban                  updateUser(2,user._id,user.userName,$index)
.4.0.1.0.1.8.0 Freshen Login Date     updateUser(9,user._id,user.userName,$index)

.4.0.1.1.1.0.0 Adjust Mic/Cam/Screen/Chat/Notes  setPermissions(user)   [data-toggle="modal" data-target="#permissionsModal"]
.4.0.1.1.1.2.0 Show User Count        updateUser(8,user._id,user.userName,$index)
.4.0.1.1.1.3.0 Hide User Count        updateUser(7,user._id,user.userName,$index)
.4.0.1.1.1.4.0 Deny Archives Access   updateUser(13,user._id,user.userName,$index)
.4.0.1.1.1.5.0 Allow Archives Access  updateUser(14,user._id,user.userName,$index)
.4.0.1.1.1.6.0 Hide Pers User Data    updateUser(10,user._id,user.userName,$index)
.4.0.1.1.1.7.0 Don't Hide Pers User Data updateUser(11,user._id,user.userName,$index)
.4.0.1.1.1.9.0 Disallow User2User PM  setUserRestrictPM(true,user._id,user.userName)
.4.0.1.1.1.10.0 Allow User2User PM    setUserRestrictPM(false,user._id,user.userName)

.4.0.1.2.1.0.0 Get App PIN            getAppPin(user.email,user.userName,$index)
.4.0.1.2.1.1.0 Show App Tokens        showAlerterAppTokens(user.userName,user.alerterAppTokens)
.4.0.1.2.1.2.0 Get FCM Tokens         getFCMTokens(user._id,user.userName,$index)
.4.0.1.2.1.4.0 PAUSE Mobile Notifs    pauseUserNotifs(user._id,user.userName,$index,'pause')
.4.0.1.2.1.5.0 RESUME Mobile Notifs   pauseUserNotifs(user._id,user.userName,$index,'resume')
.4.0.1.2.1.6.0 Remove Mobile Notifs   pauseUserNotifs(user._id,user.userName,$index,'unsub')
.4.0.1.2.1.7.0 Send Test Mobile Notifs sendTestFCM(user._id,user.userName,$index)
.4.0.1.2.1.8.0 Reset Mobile Notifs    resetFCMForuser(user._id,user.userName,$index)
```
All 33 of those anchors carry `href=""`. Path gaps (`.0.1.6`, `.1.1.1`, `.1.1.8`, `.1.1.11`, `.2.1.3`,
`.4.0.1.4`, `.4.0.1.8`, `.4.0.1.11`) are `li.divider` elements with no `<a>` child.

---

## 6. Resolved computed style — absolute values

**COMMON baseline** (substituted for every property a node does not deviate on; `DEFAULTS.txt` is not needed):
`display:block · position:static · float:none · width:auto · height:auto · margin 0px ×4 · padding 0px ×4 ·
border-width 0px ×4 · border-style none ×4 · border-color rgb(51,51,51) ×4 · border-radius 0px ×4 ·
background-color rgba(0,0,0,0) · color rgb(51,51,51) ·
font-family "Helvetica Neue", Helvetica, Arial, sans-serif · font-size 14px · font-weight 400 ·
line-height 20px · letter-spacing normal · text-align start · vertical-align baseline · white-space normal ·
overflow-x visible · overflow-y visible · opacity 1 · box-shadow none · cursor auto · box-sizing border-box`

### `<tr>` — rows 0, 1, 2

| prop | row 0 (#467) | row 1 (#468) | row 2 (#469) |
|---|---|---|---|
| display | table-row | table-row | table-row |
| position / float | static / none | static / none | static / none |
| width | 1768px | 1768px | 1768px |
| height | **41px** | **62.3828px** | **61.8828px** |
| margin ×4 / padding ×4 | 0px / 0px | 0px / 0px | 0px / 0px |
| border width/style/colour/radius | 0px ×4 / none ×4 / rgb(51,51,51) ×4 / 0px ×4 | idem | idem |
| **background-color** | **rgb(249, 249, 249)** | **rgba(0, 0, 0, 0)** | **rgb(249, 249, 249)** |
| color | rgb(51,51,51) | rgb(51,51,51) | rgb(51,51,51) |
| font-family / size / weight / line-height | Helvetica Neue stack / 14px / 400 / 20px | idem | idem |
| letter-spacing / text-align | normal / start | normal / start | normal / start |
| vertical-align | **middle** | **middle** | **middle** |
| white-space / overflow-x / overflow-y | normal / visible / visible | idem | idem |
| opacity / box-shadow / cursor | 1 / none / auto | idem | idem |

→ `.table-striped` paints `rgb(249,249,249)` on the **1st and 3rd** `tbody` rows (Bootstrap 3
`nth-of-type(odd)`), leaving the 2nd transparent. Directly evidenced, not assumed.

### `<td>` — all 15 cells (5 columns × 3 rows) share one deviation set

| prop | resolved absolute value |
|---|---|
| display | **table-cell** |
| position / float | static / none |
| width | column-dependent: `.0` 59.2656px · `.1` 722.703px · `.2` 386.406px · `.3` 313.789px · `.4` 285.836px |
| height | row-dependent: row0 **41px** · row1 **62.3828px** · row2 **61.8828px** |
| margin T/R/B/L | 0px / 0px / 0px / 0px |
| padding T/R/B/L | **8px / 8px / 8px / 8px** |
| **border-top-width** | **1px** |
| border-right / -bottom / -left width | 0px / 0px / 0px |
| **border-top-style** | **solid** |
| border-right / -bottom / -left style | none / none / none |
| **border-top-color** | **rgb(221, 221, 221)** |
| border-right / -bottom / -left colour | rgb(51,51,51) / rgb(51,51,51) / rgb(51,51,51) |
| border-radius TL/TR/BL/BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) *(the stripe lives on the `tr`, not the `td`)* |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size / font-weight | 14px / 400 |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| **vertical-align** | **top** *(vs `bottom` on the `th`)* |
| white-space | normal |
| overflow-x / overflow-y | visible / visible |
| opacity / box-shadow / cursor | 1 / none / auto |
| box-sizing | border-box |

Prior-pass hint "`td` padding 8px with matching `border-top`" — **confirmed exactly**, on all 15 cells.

### `.1.0` `<input type="checkbox">` (rendered in rows 1 & 2)

| prop | row 0 | rows 1 & 2 |
|---|---|---|
| display | **none** | **inline-block** |
| width / height | auto / auto | **13px / 13px** |
| margin T/R/B/L | **4px** / 0px / 0px / 0px | **4px** / 0px / 0px / 0px |
| padding ×4 / border ×4 / radius ×4 | 0px / 0px none rgb(51,51,51) / 0px | idem |
| background-color / color | rgba(0,0,0,0) / rgb(51,51,51) | idem |
| font-family / size / weight | Helvetica Neue stack / 14px / 400 | idem |
| **line-height** | **normal** | **normal** |
| letter-spacing / text-align / vertical-align / white-space | normal / start / baseline / normal | idem |
| overflow / opacity / box-shadow | visible / 1 / none | idem |
| **cursor** | **default** | **default** |
| **appearance** | **auto** | **auto** |

### `.1.11` `<img class="thumb24 ">` — the gravatar (renders in all three rows)

| prop | resolved |
|---|---|
| display | **inline** |
| position / float | static / none |
| width / height | **24px** / **24px** |
| margin T/R/B/L | 0px / **5px** / 0px / 0px |
| padding ×4 | 0px |
| border width/style/colour/radius | 0px ×4 / none ×4 / rgb(51,51,51) ×4 / **0px ×4** (square — no rounding) |
| background-color / color | rgba(0, 0, 0, 0) / rgb(51, 51, 51) |
| font-family / size / weight | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 |
| **line-height** | **24px** |
| letter-spacing / text-align | normal / start |
| **vertical-align** | **middle** |
| white-space | normal |
| **overflow-x / overflow-y** | **clip / clip** |
| opacity / box-shadow / cursor | 1 / none / auto |
| object-fit | fill |

> `.thumb24` is 24×24 with `line-height:24px`, `vertical-align:middle`, `overflow:clip` and
> **no border-radius** — the avatars are squares, not circles. Do not round them in the rebuild.

### `.1.14` `<br>` (renders in all three rows)
COMMON except **display: inline**. Rect w=0, h=16.5 in every row — it is the line break between the
name line and the e-mail line.

### `.1.17` `<span>` "PW set" (renders in **row 2 only**)
COMMON except **display: inline** (rows 0 & 1: `display:none` via `class="ng-hide"`).
colour rgb(51,51,51), 14px/20px, weight 400, cursor auto. Rect 305 / 688.3 / 73.3 / 16.5.

### `.1.17.0` `<i class="fa fa-lock">` (renders in **row 2 only**)

| prop | row 2 (rendering) | rows 0 & 1 (parent hidden) |
|---|---|---|
| display | **inline-block** | inline-block |
| width / height | **9px / 14px** | auto / auto |
| font-family | **FontAwesome** | FontAwesome |
| font-size | 14px | 14px |
| **line-height** | **14px** | **14px** |
| **transform** | **matrix(1, 0, 0, 1, 0, 0)** | none |
| colour / background | rgb(51,51,51) / rgba(0,0,0,0) | idem |
| `::before` | `content:"" · color rgb(51,51,51) · font-family FontAwesome · font-size 14px · background rgba(0,0,0,0)` | idem |
| *(all other props)* | COMMON | COMMON |

### `.3.1` / `.3.2` / `.3.3` / `.3.4` — the four role `<span>`s
Each deviates on **exactly one** property: `display: inline` when its `ng-show` is true,
`display: none` when false. Everything else is COMMON — colour `rgb(51, 51, 51)`,
font `"Helvetica Neue", Helvetica, Arial, sans-serif` 14px/20px weight 400, `letter-spacing normal`,
`text-align start`, `vertical-align baseline`, `white-space normal`, `overflow visible`, `opacity 1`,
`box-shadow none`, `cursor auto`, no border, no padding, no margin, `background rgba(0,0,0,0)`.

| span | row 0 | row 1 | row 2 |
|---|---|---|---|
| `.3.1` Participant | none | **inline** (1213.4 / 600.5 / 67.4 / 16.5) | none |
| `.3.2` Owner | **inline** (1213.4 / 559.5 / 41.2 / 16.5) | none | none |
| `.3.3` Presenter | none | none | none |
| `.3.4` Admin | none | none | **inline** (1213.4 / 662.9 / 40.2 / 16.5) |

### `.3.5` `<span class="ng-binding">` — the `/ …` separator
Single deviation: `display: none` (row 0) / `display: inline` (rows 1 & 2). All other properties COMMON.
Rect row 1: 1284.7 / 600.5 / 38.6 / 16.5. Rect row 2: 1257.5 / 662.9 / 54.2 / 16.5.

### `.4.0` `<div class="btn-group mb-sm mr">` (renders rows 1 & 2)

| prop | row 0 | rows 1 & 2 |
|---|---|---|
| display | **none** | **inline-block** |
| position | **relative** | **relative** (top 0px, right 0px, bottom 0px, left 0px) |
| float | none | none |
| width / height | auto / auto | **88.7188px / 34px** |
| margin T/R/B/L | 0px / **10px** / **5px** / 0px | 0px / **10px** / **5px** / 0px |
| padding ×4 / border ×4 / radius ×4 | 0px / 0px none rgb(51,51,51) / 0px | idem |
| background / colour | rgba(0,0,0,0) / rgb(51,51,51) | idem |
| font / line-height / letter-spacing | Helvetica Neue stack 14px 400 / 20px / normal | idem |
| text-align / **vertical-align** / white-space | start / **middle** / normal | idem |
| overflow / opacity / box-shadow / cursor | visible / 1 / none / auto | idem |

(`mr` = `margin-right:10px`, `mb-sm` = `margin-bottom:5px` — both resolved from the capture, not from
Bootstrap docs.)

### `.4.0.0` `<button class="btn dropdown-toggle btn-primary">` "Actions" (renders rows 1 & 2)

| prop | resolved (rows 1 & 2) |
|---|---|
| display | inline-block *(COMMON `block` is overridden only by the `float:left`; the capture records `position:relative` + `float:left`; the resulting box is 88.7188 × 34)* |
| position | **relative** (top 0px, right 0px, bottom 0px, left 0px) |
| **float** | **left** |
| width / height | **88.7188px** / **34px** |
| margin T/R/B/L | 0px / 0px / 0px / 0px |
| padding T/R/B/L | **6px / 12px / 6px / 12px** |
| border-width T/R/B/L | **1px ×4** |
| border-style T/R/B/L | **solid ×4** |
| border-color T/R/B/L | **rgb(46, 109, 164) ×4** |
| border-radius TL/TR/BL/BR | **4px ×4** |
| background-color | **rgb(51, 122, 183)** |
| color | **rgb(255, 255, 255)** |
| font-family / size / weight / line-height | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 / 20px |
| letter-spacing | normal |
| text-align / vertical-align / white-space | **center** / **middle** / **nowrap** |
| overflow-x / -y / opacity / box-shadow | visible / visible / 1 / none |
| cursor | **pointer** (user-select none; outline-color rgb(255,255,255)) |

> In **row 0** this button is inside a `display:none` parent, so its own deviation set omits the
> `top/right/bottom/left/width/height` entries (30 deviations vs 36) — its resolved `width`/`height`
> are `auto` and it paints nothing.

### `.4.0.0.0` `<span class="caret">` (renders rows 1 & 2)

| prop | rows 1 & 2 | row 0 |
|---|---|---|
| display | **inline-block** | inline-block |
| width / height | **8px / 4px** | **0px / 0px** |
| border-width T/R/B/L | **4px / 4px / 0px / 4px** | idem |
| border-style T/R/B/L | **dashed / solid / none / solid** | idem |
| border-color T/R/B/L | **rgb(255,255,255) / rgba(0,0,0,0) / rgb(255,255,255) / rgba(0,0,0,0)** | idem |
| colour | **rgb(255, 255, 255)** | idem |
| text-align / vertical-align / white-space | **center / middle / nowrap** | idem |
| cursor | **pointer** (user-select none) | idem |
| *(margin, padding, radius, background, font, line-height, letter-spacing, overflow, opacity, box-shadow)* | 0px ×4 / 0px ×4 / 0px ×4 / rgba(0,0,0,0) / Helvetica Neue 14px 400 / 20px / normal / visible / 1 / none | idem |

### `.4.0.0.1` and `.4.0.0.1.0` — the material ripple host (zero-width, no paint)
`.4.0.0.1`: `display inline · border-colour rgb(255,255,255) ×4 · colour rgb(255,255,255) ·
text-align center · white-space nowrap · cursor pointer · user-select none`; rect w=**0**, h=16.5.
`.4.0.0.1.0`: same plus the inline style `width: 107px; height: 107px; left: -10.6719px; top: -42.5px;`
resolving to `width 107px · height 107px · top -42.5px · left -10.6719px` on a `display:inline` box —
so those values are computed but **do not affect layout** (rect w=0). Neither element paints anything in
the baseline; do not attempt to render a ripple in a static rebuild.

### Non-rendering template nodes — resolved values (needed for the rebuild, none paint in the baseline)

| node(s) | resolved |
|---|---|
| `.1.1` / `.1.2` (`fa-2x`) | `display none · font-family FontAwesome · font-size 28px · line-height 28px`; `::before` colour rgb(51,51,51), 28px |
| `.1.3` / `.1.5` – `.1.9` | `display none · font-family FontAwesome · font-size 14px · line-height 14px`; `::before` colour rgb(51,51,51), 14px |
| `.1.4` / `.1.10` (`style="color: red;"`) | `display none · font-family FontAwesome · line-height 14px · colour rgb(255,0,0) · border-colour rgb(255,0,0) ×4 · outline-color rgb(255,0,0)`; `::before` colour **rgb(255,0,0)**, 14px |
| `.1.12` discord div | `display none · margin-left 10px · colour rgb(255,0,0) · border-colour rgb(255,0,0) ×4 · font-size 12px · line-height 17.1429px` |
| `.1.13` `span.badge.badge-danger-chat` | `display none · min-width 10px · margin-right 20px · padding 3px 7px 3px 7px · border-radius 10px ×4 · **background-color rgb(255, 0, 0)** · colour rgb(255,255,255) · border-colour rgb(255,255,255) ×4 · font-size 12px · font-weight 700 · line-height 12px · text-align center · vertical-align middle · white-space nowrap` |
| `.1.18` / `.1.19` `span.badge.badge-danger` | identical to the above **except no `margin-right`** and **`background-color rgb(119, 119, 119)`** |
| `.1.15` / `.1.16` | `display none`, everything else COMMON |
| `.2.0` / `.2.1` (`style="color:red"`) | `display none · colour rgb(255,0,0) · border-colour rgb(255,0,0) ×4 · outline-color rgb(255,0,0)` |
| `.2.1.0` `<br>` | `display inline · colour rgb(255,0,0) · border-colour rgb(255,0,0) ×4` |
| `.2.1.1` `i.fa-comment-o` | `display inline-block · font-family FontAwesome · line-height 14px · colour rgb(255,0,0) · border-colour rgb(255,0,0) ×4`; `::before` colour rgb(255,0,0) |
| `.2.2` note div | `display none · padding 5px ×4 · border 1px solid rgb(160, 160, 160) ×4` |
| `.2.2.0` `<br>` | `display inline` |
| `.3.0` APPROVE button | `display none · padding 6px 12px 6px 12px · border 1px solid **rgb(238, 162, 54)** ×4 · border-radius 4px ×4 · **background rgb(240, 173, 78)** · colour rgb(255,255,255) · text-align center · vertical-align middle · white-space nowrap · cursor pointer · user-select none` |
| `.3.6` / `.3.7` | `display none · colour rgb(255,0,0) · border-colour rgb(255,0,0) ×4 · outline-color rgb(255,0,0)` |
| `.4.0.1` `ul.dropdown-menu.dropdown-menu-right` | `display none · position absolute · top 100% · **right 0px** · z-index 1000 · min-width 160px · margin-top 2px · padding 5px 0 · border 1px solid rgba(0,0,0,0.15) ×4 · border-radius 2px ×4 · background rgb(255,255,255) · background-clip padding-box · font-size 13px · line-height 18.5714px · text-align left · box-shadow rgba(0,0,0,0.176) 0px 6px 12px 0px · list-style-type none` |
| nested `ul.dropdown-menu` (`.4.0.1.{0,1,2,3}.1`) | same but **`left: 0px`** instead of `right: 0px` |
| `li.dropdown-submenu` (`.4.0.1.{0,1,2,3}`) | `display list-item · **position relative** · font-size 13px · line-height 18.5714px · text-align left · list-style-type none` |
| plain `li` | `display list-item · font-size 13px · line-height 18.5714px · text-align left · list-style-type none` |
| `li.divider` | `display list-item · height 1px · margin 9px 0 · background-color rgb(229, 229, 229) · font-size 13px · line-height 18.5714px · text-align left · overflow hidden · list-style-type none` |
| menu `<a>` | `display block · padding 3px 20px 3px 20px · font-size 13px · line-height 18.5714px · text-align left · white-space nowrap · cursor pointer · colour rgb(51,51,51) · list-style-type none` |
| menu `<i>` | `display inline-block · font-family FontAwesome · font-size 13px · line-height 13px · text-align left · white-space nowrap · cursor pointer · list-style-type none`; `::before` colour rgb(51,51,51), 13px |
| `i.fa-caret-right.pull-right` | as menu `<i>` plus **`float: right`** and **`margin-left: 3.9px`** (no `display` deviation) |

Two menu icons — `.4.0.1.1.1.2.0.0` and `.4.0.1.1.1.3.0.0`, both `fa fa-user-circle` — and
`.4.0.1.2.1.8.0.1` (`fa fa-reload`) have **no `::before` record** in the capture: those glyph names do not
exist in the loaded FontAwesome version, so the pseudo-element resolves to nothing. That is a real
rendering defect in the source app, faithfully recorded here (`fa-reload` is not a FontAwesome 4 class;
`fa-user-circle` is FA 4.7+).

---

## 7. Column-by-column anatomy of one row + the row 0/1/2 diff

### 7.1 The repeating template, column by column

```
<tr ng-repeat="user in xrefs  " class="ng-scope">

  <!-- ===== COLUMN 0 : "#"  (w 59.2656) ============================== -->
  <td class="ng-binding">{{$index}}</td>            <!-- text = "0" | "1" | "2" -->

  <!-- ===== COLUMN 1 : "Name / Email"  (w 722.703) =================== -->
  <td class="ng-binding">
      <input type="checkbox" name="checkbox" ng-show="user.role!==0"
             ng-checked="checkedUserIds[user._id]" ng-click="getCheckedUserIds(user._id)">
      <i class="fa fa-folder-o fa-2x" ng-show="false" aria-hidden="true"></i>       <!-- .1.1  always off -->
      <i class="fa fa-mobile fa-2x"   ng-show="false" aria-hidden="true"></i>       <!-- .1.2  always off -->
      <i class="fa fa-mobile"         ng-show="false" aria-hidden="true"></i>       <!-- .1.3  always off -->
      <i class="fa fa-mobile" style="color: red;" ng-show="false" aria-hidden="true"></i>
      <i class="fa fa-microphone"        ng-show="user.hasMic"    aria-hidden="true"></i>
      <i class="fa fa-video-camera"      ng-show="user.hasCam"    aria-hidden="true"></i>
      <i class="fa fa-desktop"           ng-show="user.hasScreen" aria-hidden="true"></i>
      <i class="fa fa-comment-o"         ng-show="user.hasAdminChat"  aria-hidden="true"></i>
      <i class="fa fa-pencil-square-o"   ng-show="user.canEditNotes"  aria-hidden="true"></i>
      <i class="fa fa-hdd-o" ng-show="user.denyArchivesAccess" title="Denied Archives Access"
         style="color: red;" aria-hidden="true"></i>
      <img gravatar-src-once="user.email " style="margin-right:5px " class="thumb24 ">
      {{ user.userName }}                                   <!-- direct text node -->
      <div ng-show="user.discordUserId" class="ng-binding"
           style="color: red; font-size: 12px; margin-left: 10px;">Discord Username:</div>
      <span ng-show="user.isFreeTrial" class="badge badge-danger-chat"
            style="color: white; margin-right: 20px;">TRIAL</span>
      <br>
      <span ng-show="showPins && user.mobilePairCode" class="ng-binding">|<i class="fa fa-mobile"></i></span>
      <span ng-show="user.phone" class="ng-binding"><i class="fa fa-phone"></i></span>
      {{ user.email }}                                      <!-- direct text node -->
      <span ng-show="user.pw">PW set<i class="fa fa-lock" aria-hidden="true"></i></span>
      <span class="badge badge-danger" ng-show="user.hideUserCount">User Count Hidden</span>
      <span class="badge badge-danger" ng-show="user.hidePersInfo">User Personal Info Hidden</span>
  </td>

  <!-- ===== COLUMN 2 : "Last Login/Notes"  (w 386.406) =============== -->
  <td class="ng-binding">
      {{ lastLogin }}                                       <!-- direct text node -->
      <span ng-show="user.inactive" style="color: red;">*** INACTIVE USER ***</span>
      <span ng-show="user.restrictPMUser" style="color: red;">User PMs disabled<br><i class="fa fa-comment-o"></i></span>
      <div ng-show="user.note" class="ng-binding" style="border: 1px solid #A0A0A0; padding: 5px; "><br></div>
  </td>

  <!-- ===== COLUMN 3 : "Role / Status"  (w 313.789) ================== -->
  <td>
      <button class="btn btn-small btn-warning" ng-show="user.inviteStatus=='pending' "
              ng-click="approveUser(user.userName,user._id,$index,'approved')">APPROVE</button>
      <span ng-show="user.role==2 ">Participant</span>
      <span ng-show="user.role==0 ">Owner</span>
      <span ng-show="user.role==1 && !user.nonPresenter">Presenter</span>
      <span ng-show="user.role==1 && user.nonPresenter">Admin</span>
      <span ng-hide="user.role==0" class="ng-binding">/ {{ …loginKind… }}</span>
      <span ng-show="user.role==3 " style="color: red;">CHAT MUTED</span>
      <span ng-show="user.role==4 " style="color: red;">BANNED</span>
  </td>

  <!-- ===== COLUMN 4 : "Actions"  (w 285.836) ======================== -->
  <td>
      <div ng-hide="user.role==0" dropdown="dropdown" class="btn-group mb-sm mr"
           ng-init="submenuOpen={permissions:false, granular:false, app:false, badges:false}"
           on-toggle="!open && (submenuOpen={permissions:false, granular:false, app:false, badges:false})">
        <button type="button" ng-disabled="disabled" dropdown-toggle=""
                class="btn dropdown-toggle btn-primary" aria-haspopup="true" aria-expanded="false">
          Actions <span class="caret"></span><span><span style="width: 107px; height: 107px; left: -10.6719px; top: -42.5px;"></span></span>
        </button>
        <ul role="menu" class="dropdown-menu dropdown-menu-right">
          <li class="dropdown-submenu" ng-class="{open: submenuOpen.permissions}">…Permissions ▸ 9 items…</li>
          <li class="dropdown-submenu" ng-class="{open: submenuOpen.granular}">…Granular Perms ▸ 12 items…</li>
          <li class="dropdown-submenu" ng-class="{open: submenuOpen.app}">…App and Notifications ▸ 9 items…</li>
          <li class="dropdown-submenu" ng-class="{open: submenuOpen.badges}">…Badges ▸ EMPTY…</li>
          <li class="divider"></li>
          <li><a href="" ng-click="setNoteUser(user._id,user.userName,$index)"><i class="fa fa-pencil-square-o"></i> Set Note</a></li>
          <li><a href="" ng-click="editUsername(user._id, user.userName)"><i class="fa fa-edit"></i> Edit Username</a></li>
          <li><a href="" ng-click="deleteParticipant(user.userName,user._id,$index)"><i class="fa fa-trash"></i> Remove User</a></li>
          <li class="divider"></li>
          <li><a href="" ng-click="setUserPW(user._id,user.userName,$index)"><i class="fa fa-lock"></i> Set/Change Password</a></li>
          <li><a href="" ng-click="sendWelcomeEmail(user._id,user.userName,$index)"><i class="fa fa-envelope"></i> Resend Welcome Email</a></li>
          <li class="divider"></li>
          <li><a href="" ng-click="approveUser(user.userName,user._id,$index,'pending')"><i class="fa fa-pause"></i> Pause / Pending</a></li>
        </ul>
      </div>
  </td>
</tr>
```

**Column 1's rendered line structure**, derived from the rects:
`line 1` = [checkbox] [gravatar 24×24] [user name] `<br>`
`line 2` = [user e-mail] [optional "PW set" + lock icon] …
Row 0 renders only line 1 (empty name → 41px row); rows 1 and 2 render two lines (62.4 / 61.9px rows).

**Column 3's rendered content** is exactly two inline spans: the role word (`.3.1`/`.3.2`/`.3.3`/`.3.4`)
and the `/ …` separator span (`.3.5`).

### 7.2 What makes row 0 different (Owner, `user.role === 0`)

| aspect | row 0 |
|---|---|
| `td.0` text | `0` |
| **Name / e-mail** | **BOTH EMPTY** — `td .1` has no `text:` field at all. The `<br>` at x=133.3 = `104.3 + 24 + 5` proves nothing is drawn between the avatar and the break. |
| **gravatar `src`** | **NO `src` attribute on the `<img>`** — `gravatar-src-once="user.email "` produced nothing because the e-mail is empty. The 24×24 box is present but there is no image resource. |
| **select checkbox** `.1.0` | `class="ng-hide"` → `display:none` (`ng-show="user.role!==0"` is false) |
| **Last login** `td .2` | no text |
| **Role** | `.3.2` "Owner" visible; `.3.1`/`.3.3`/`.3.4` hidden |
| **`/ …` separator** `.3.5` | hidden, and its text is the bare `/` (no suffix) |
| **Actions menu** `.4.0` | `class="btn-group mb-sm mr ng-hide"` → **the entire Actions dropdown is absent for the Owner** |
| **Row stripe** | `background-color: rgb(249, 249, 249)` (1st `tbody` row = odd) |
| **Row height** | **41px** (single line) |

### 7.3 Row 1 (Participant) vs row 2 (Admin) — the complete diff

Every differing line from the normalised `diff -u row1 row2`, nothing omitted:

| path | row 1 | row 2 |
|---|---|---|
| `<tr>` background-color | rgba(0, 0, 0, 0) | **rgb(249, 249, 249)** |
| `<tr>` / all `td` height | 62.3828px | 61.8828px |
| `td .0` text | `1` | `2` |
| `td .1` text | `[OWNER_NAME]` … `[MEMBER_A_EMAIL]` | `[OWNER_SHORT_NAME]` … `[OWNER_EMAIL]` |
| `td .2` text | `[MEMBER_A_LAST_LOGIN]` | **no text** (never logged in / no date recorded) |
| `.1.11` img `src` | `…/avatar/[GRAVATAR_MD5_A]?size=80&default=mm` | `…/avatar/[GRAVATAR_MD5_B]?size=80&default=mm` |
| `.1.14` `<br>` x | 224 | 176.1 |
| `.1.17` "PW set" | `class="ng-hide"`, `display:none` | **no class**, `display:inline`, rect 305 / 688.3 / 73.3 / 16.5 |
| `.1.17.0` `i.fa-lock` | no box | **9 × 14 at 320.6 / 689.8**, `transform: matrix(1,0,0,1,0,0)` |
| `.3.1` Participant | **display: inline** (1213.4 / 600.5 / 67.4 / 16.5) | `ng-hide`, display: none |
| `.3.4` Admin | `ng-hide`, display: none | **display: inline** (1213.4 / 662.9 / 40.2 / 16.5) |
| `.3.5` separator text | `/ login` (w 38.6 @ x 1284.7) | `/ manual` (w 54.2 @ x 1257.5) |
| `.4.0.1.1.1.0` `li[ng-show="user.role !== 1"]` | display: list-item | **`class="ng-hide"`, display: none** |
| all y-coordinates | row top 590.5 | row top 652.9 |

**Role inference, fully evidenced:**
* Row 1: `.3.1` (`user.role==2`) is visible → **role 2 = Participant**. Consistent with
  `.4.0.1.1.1.0` (`ng-show="user.role !== 1"`) being visible.
* Row 2: `.3.4` (`user.role==1 && user.nonPresenter`) is visible → **role 1 with `nonPresenter` truthy =
  Admin**. Independently corroborated by `.4.0.1.1.1.0` being `ng-hide`den (its condition
  `user.role !== 1` is false). Two independent bindings agree.
* Row 0: `.3.2` (`user.role==0`) visible and `.4.0` (`ng-hide="user.role==0"`) hidden → **role 0 = Owner**.

**Badges and status icons:** *none* of the badge/status elements render in **any** of the three rows.
`.1.13` (TRIAL, `badge-danger-chat`), `.1.18` (User Count Hidden, `badge-danger`), `.1.19`
(User Personal Info Hidden, `badge-danger`), `.2.0` (INACTIVE USER), `.2.1` (User PMs disabled),
`.2.2` (note box), `.3.0` (APPROVE), `.3.6` (CHAT MUTED), `.3.7` (BANNED), and all ten `fa` status icons
`.1.1`–`.1.10` are `display:none` in all three rows. The **only** status affordance that paints anywhere
is row 2's "PW set" + `fa-lock`.

---

## 8. Verbatim text — every string, with its path — ⚠️ LIVE PII

### 8.1 Live member data (evidence only — never hard-code)

| path | row | verbatim text | note |
|---|---|---|---|
| `…3.1.0.0` | 0 | `0` | `$index` |
| `…3.1.1.0` | 1 | `1` | `$index` |
| `…3.1.2.0` | 2 | `2` | `$index` |
| `…3.1.0.1` | 0 | *(no `text:` field — no non-whitespace direct text)* | Owner has **no name and no e-mail** |
| `…3.1.1.1` | 1 | see exact decomposition below | **⚠️ PII: name + e-mail** |
| `…3.1.2.1` | 2 | see exact decomposition below | **⚠️ PII: name + e-mail** |
| `…3.1.0.2` | 0 | *(no `text:` field)* | no last-login recorded |
| `…3.1.1.2` | 1 | `[MEMBER_A_LAST_LOGIN]` | **⚠️ PII: real login timestamp** |
| `…3.1.2.2` | 2 | *(no `text:` field)* | no last-login recorded |
| `…3.1.1.3.5` | 1 | `/ login` | login-kind suffix |
| `…3.1.2.3.5` | 2 | `/ manual` | login-kind suffix |
| `…3.1.0.3.5` | 0 | `/` | hidden |

**Exact character-level decomposition of the Name/Email cells** (each `\n` is a literal newline; the
capture stores them escaped, the counts below were measured, not estimated):

Row 1 — `r.0.1.1.0.1.3.1.0.0.3.1.1.1` — 246 raw characters:
```
segment 0 : 0 spaces  + "[OWNER_NAME]"            <- ⚠️ PII (userName)
\n
segment 1 : 40 spaces + ""
\n
segment 2 : 40 spaces + ""
\n
segment 3 : 40 spaces + ""
\n
segment 4 : 0 spaces  + ""
\n
segment 5 : 40 spaces + ""
\n
segment 6 : 41 spaces + "[MEMBER_A_EMAIL]"   <- ⚠️ PII (email)
```

Row 2 — `r.0.1.1.0.1.3.1.0.0.3.1.2.1` — 240 raw characters:
```
segment 0 : 0 spaces  + "[OWNER_SHORT_NAME]"                          <- ⚠️ PII (userName)
segment 1 : 40 spaces + ""      (…same 6-newline skeleton…)
segment 2 : 40 spaces + ""
segment 3 : 40 spaces + ""
segment 4 : 0 spaces  + ""
segment 5 : 40 spaces + ""
segment 6 : 41 spaces + "[OWNER_EMAIL]"   <- ⚠️ PII (email)
```

The identical 6-newline / 40-space skeleton in both rows is the Angular template's source indentation
between `{{user.userName}}`, the intervening conditional elements, the `<br>`, and `{{user.email}}`.
**Reproduce the skeleton, never the payload.**

### 8.2 Gravatar `src` — every avatar URL in the capture ⚠️ PII

| row | `src` |
|---|---|
| 0 | **no `src` attribute at all** — the `gravatar-src-once` directive did not fire (empty `user.email`) |
| 1 | `https://secure.gravatar.com/avatar/[GRAVATAR_MD5_A]?size=80&default=mm` |
| 2 | `https://secure.gravatar.com/avatar/[GRAVATAR_MD5_B]?size=80&default=mm` |

Directive attribute (all three rows): `gravatar-src-once="user.email "` (trailing space).
Query string is `?size=80&default=mm` in both cases, rendered into a 24 × 24 box (2× density).
**⚠️ The MD5 hashes are lower-cased-e-mail digests, i.e. they ARE the member identifiers. Treat them as PII.**

### 8.3 Static template strings (safe to hard-code)

| path | text |
|---|---|
| `.1.12` | `Discord Username:` |
| `.1.13` | `TRIAL` |
| `.1.15` | `\|` |
| `.1.17` | `PW set` |
| `.1.18` | `User Count Hidden` |
| `.1.19` | `User Personal Info Hidden` |
| `.2.0` | `*** INACTIVE USER ***` |
| `.2.1` | `User PMs disabled` |
| `.3.0` | `APPROVE` |
| `.3.1` | `Participant` |
| `.3.2` | `Owner` |
| `.3.3` | `Presenter` |
| `.3.4` | `Admin` |
| `.3.6` | `CHAT MUTED` |
| `.3.7` | `BANNED` |
| `.4.0.0` | `Actions` |
| `.4.0.1.0.0` | `Permissions` |
| `.4.0.1.1.0` | `Granular Perms` |
| `.4.0.1.2.0` | `App and Notifications` |
| `.4.0.1.3.0` | `Badges` |
| `.4.0.1.5.0` | `Set Note` |
| `.4.0.1.6.0` | `Edit Username` |
| `.4.0.1.7.0` | `Remove User` |
| `.4.0.1.9.0` | `Set/Change Password` |
| `.4.0.1.10.0` | `Resend Welcome Email` |
| `.4.0.1.12.0` | `Pause / Pending` |
| `.4.0.1.0.1.0.0` | `Make Presenter` |
| `.4.0.1.0.1.1.0` | `Make Admin` |
| `.4.0.1.0.1.2.0` | `Make Participant` |
| `.4.0.1.0.1.3.0` | `Make Trial` |
| `.4.0.1.0.1.4.0` | `MUTE Participant` |
| `.4.0.1.0.1.5.0` | `BAN` |
| `.4.0.1.0.1.7.0` | `Unban` |
| `.4.0.1.0.1.8.0` | `Freshen Login Date` |
| `.4.0.1.1.1.0.0` | `Adjust Mic/Cam/Screen/Chat/Notes` |
| `.4.0.1.1.1.2.0` | `Show User Count` |
| `.4.0.1.1.1.3.0` | `Hide User Count` |
| `.4.0.1.1.1.4.0` | `Deny Archives Access` |
| `.4.0.1.1.1.5.0` | `Allow Archives Access` |
| `.4.0.1.1.1.6.0` | `Hide Pers User Data` |
| `.4.0.1.1.1.7.0` | `Don't Hide Pers User Data` |
| `.4.0.1.1.1.9.0` | `Disallow User2User PM` |
| `.4.0.1.1.1.10.0` | `Allow User2User PM` |
| `.4.0.1.2.1.0.0` | `Get App PIN` |
| `.4.0.1.2.1.1.0` | `Show App Tokens` |
| `.4.0.1.2.1.2.0` | `Get FCM Tokens` |
| `.4.0.1.2.1.4.0` | `PAUSE Mobile Notifs` |
| `.4.0.1.2.1.5.0` | `RESUME Mobile Notifs` |
| `.4.0.1.2.1.6.0` | `Remove Mobile Notifs` |
| `.4.0.1.2.1.7.0` | `Send Test Mobile Notifs` |
| `.4.0.1.2.1.8.0` | `Reset Mobile Notifs` |

**Truncation check:** the dump caps a `text:` field at **250 raw characters** (measured over the whole
capture: exactly four nodes reach 250, the next-longest is 248). The two longest strings in P08 are the
Name/Email cells at **246** and **240** raw characters — both **under** the cap. **Nothing in P08 is
truncated.**

---

## 9. Rebuild spec — exact HTML + CSS

### 9.1 HTML

Use §7.1 as the row template verbatim. Bind it to the real `xrefs` collection — for the three captured
rows the *rendered* result must be:

| # | Name | E-mail | Last Login/Notes | Role / Status | Actions |
|---|---|---|---|---|---|
| 0 | *(empty)* | *(empty)* | *(empty)* | `Owner` | *(no menu)* |
| 1 | *from API* | *from API* | *from API* | `Participant` + `/ login` | `Actions ▾` |
| 2 | *from API* | *from API* | *(empty)* | `Admin` + `/ manual` | `Actions ▾` + `PW set 🔒` in col 1 |

> **Honest-data rule:** the "from API" cells must come from the live `xrefs` payload or show an explicit
> pending state. Do **not** paste `[OWNER_NAME]` / `[MEMBER_A_EMAIL]` / the gravatar hashes /
> `[MEMBER_A_LAST_LOGIN]` into the rebuild to make a screenshot look complete.

### 9.2 CSS — resolved, no variables, no flex, no grid

```css
/* ---- rows ------------------------------------------------------------ */
table.table > tbody > tr { display: table-row; vertical-align: middle;
                           background-color: rgba(0,0,0,0); }
table.table.table-striped > tbody > tr:nth-of-type(odd) { background-color: rgb(249,249,249); }

/* ---- cells ----------------------------------------------------------- */
table.table > tbody > tr > td {
  display: table-cell;
  box-sizing: border-box;
  margin: 0;
  padding: 8px;                                 /* all four sides */
  border: 0 none rgb(51,51,51);
  border-top: 1px solid rgb(221,221,221);       /* the ONLY painted border */
  border-radius: 0;
  background-color: rgba(0,0,0,0);
  color: rgb(51,51,51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px; font-weight: 400; line-height: 20px; letter-spacing: normal;
  text-align: start;
  vertical-align: top;                          /* NB: th is `bottom`, td is `top` */
  white-space: normal; overflow: visible; opacity: 1; box-shadow: none; cursor: auto;
}
table.table > tbody > tr > td:nth-child(1) { width: 59.2656px; }
table.table > tbody > tr > td:nth-child(2) { width: 722.703px; }
table.table > tbody > tr > td:nth-child(3) { width: 386.406px; }
table.table > tbody > tr > td:nth-child(4) { width: 313.789px; }
table.table > tbody > tr > td:nth-child(5) { width: 285.836px; }

/* ---- avatar ---------------------------------------------------------- */
img.thumb24 { display: inline; width: 24px; height: 24px;
              margin: 0 5px 0 0; padding: 0; border: 0; border-radius: 0;   /* square! */
              line-height: 24px; vertical-align: middle; overflow: clip;
              object-fit: fill; }

/* ---- row checkbox ---------------------------------------------------- */
td input[type="checkbox"][name="checkbox"] {
  display: inline-block; width: 13px; height: 13px;
  margin: 4px 0 0 0; line-height: normal; cursor: default;
  -webkit-appearance: auto; appearance: auto;
}

/* ---- role spans / separator ----------------------------------------- */
td > span { display: inline; color: rgb(51,51,51);
            font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; }

/* ---- "PW set" lock icon --------------------------------------------- */
.fa-lock { display: inline-block; width: 9px; height: 14px;
           font-family: FontAwesome; font-size: 14px; line-height: 14px;
           color: rgb(51,51,51); transform: matrix(1,0,0,1,0,0); }

/* ---- Actions button group -------------------------------------------- */
.btn-group.mb-sm.mr { display: inline-block; position: relative;
                      top:0; right:0; bottom:0; left:0;
                      width: 88.7188px; height: 34px;
                      margin: 0 10px 5px 0;              /* mr=10px, mb-sm=5px */
                      vertical-align: middle; }
.btn-group > .btn.dropdown-toggle.btn-primary {
  position: relative; top:0; right:0; bottom:0; left:0; float: left;
  box-sizing: border-box; width: 88.7188px; height: 34px;
  margin: 0; padding: 6px 12px;
  border: 1px solid rgb(46,109,164); border-radius: 4px;
  background-color: rgb(51,122,183); color: rgb(255,255,255);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center; vertical-align: middle; white-space: nowrap;
  overflow: visible; opacity: 1; box-shadow: none; cursor: pointer;
  -webkit-user-select: none; user-select: none; outline-color: rgb(255,255,255);
}
.btn-group .caret { display: inline-block; width: 8px; height: 4px;
  border-top: 4px dashed rgb(255,255,255);
  border-right: 4px solid rgba(0,0,0,0);
  border-bottom: 0 none rgb(255,255,255);
  border-left: 4px solid rgba(0,0,0,0);
  color: rgb(255,255,255); text-align: center; vertical-align: middle;
  white-space: nowrap; cursor: pointer; }

/* ---- hidden-state definitions (recorded, never painted in the baseline) */
.ng-hide { display: none !important; }
.badge { display: inline-block; min-width: 10px; padding: 3px 7px;
         border-radius: 10px; background-color: rgb(119,119,119);
         color: rgb(255,255,255); border-color: rgb(255,255,255);
         font-size: 12px; font-weight: 700; line-height: 12px;
         text-align: center; vertical-align: middle; white-space: nowrap; }
.badge.badge-danger      { background-color: rgb(119,119,119); }  /* NO-OP — see §10.4 */
.badge.badge-danger-chat { background-color: rgb(255,0,0); }
.btn-warning { border-color: rgb(238,162,54); background-color: rgb(240,173,78);
               color: rgb(255,255,255); }
.dropdown-menu.dropdown-menu-right { right: 0; left: auto; }
li.dropdown-submenu { position: relative; }
.fa-caret-right.pull-right { float: right; margin-left: 3.9px; }
```

### 9.3 Geometry assertions (Playwright / screenshot diff)

```
tbody                       x=37     y=549.5 w=1768    h=165.266
tr:nth-child(1)             x=37     y=549.5 w=1768    h=41       bg rgb(249,249,249)
  td:nth-child(1)                    y=549.5 w=59.2656 h=41       text "0"
  img.thumb24               x=104.3  y=558   w=24      h=24       NO src
  br                        x=133.3  y=560.1 w=0       h=16.5
  span "Owner"              x=1213.4 y=559.5 w=41.2    h=16.5
  .btn-group                                                       display:none
tr:nth-child(2)             x=37     y=590.5 w=1768    h=62.3828  bg rgba(0,0,0,0)
  input[type=checkbox]      x=104.3  y=603   w=13      h=13
  img.thumb24               x=121.2  y=600.4 w=24      h=24
  br                        x=224    y=602.5 w=0       h=16.5
  span "Participant"        x=1213.4 y=600.5 w=67.4    h=16.5
  span "/ login"            x=1284.7 y=600.5 w=38.6    h=16.5
  .btn-group / button       x=1527.2 y=599   w=88.7188 h=34
  .caret                    x=1594.9 y=615.4 w=8       h=4
tr:nth-child(3)             x=37     y=652.9 w=1768    h=61.8828  bg rgb(249,249,249)
  input[type=checkbox]      x=104.3  y=665.4 w=13      h=13
  img.thumb24               x=121.2  y=662.8 w=24      h=24
  br                        x=176.1  y=664.9 w=0       h=16.5
  span "PW set"             x=305    y=688.3 w=73.3    h=16.5
  i.fa-lock                 x=320.6  y=689.8 w=9       h=14
  span "Admin"              x=1213.4 y=662.9 w=40.2    h=16.5
  span "/ manual"           x=1257.5 y=662.9 w=54.2    h=16.5
  .btn-group / button       x=1527.2 y=661.4 w=88.7188 h=34
  .caret                    x=1594.9 y=677.8 w=8       h=4
```

Invariants: `Σ row heights == 165.2656 == tbody.h`; `td.borderTopColor == "rgb(221, 221, 221)"` on all 15;
`td.verticalAlign == "top"`; `tr:nth-of-type(odd).backgroundColor == "rgb(249, 249, 249)"` and
`tr:nth-of-type(even).backgroundColor == "rgba(0, 0, 0, 0)"`; row 0 has **zero** `.btn-group` boxes.

---

## 10. Honest gaps

1. **The row Actions menus were all closed at capture time.** In every row `.4.0.1` is `display:none`, so
   all 13 top-level `li`, the 4 nested `ul`, their 30 `li`, 33 `a` and 33 `i` have `rect 0×0`. Their
   **computed styles are fully recorded** (§6), but their **rendered geometry — open-state width, item
   height, submenu offsets — is not in the capture.** Do not assert it.
2. **The `Badges` submenu is empty in the capture.** `.4.0.1.3.1` (`ul.dropdown-menu`) has **no `<li>`
   children** in any of the three rows (verified against the exhaustive 176-node path list). Whether the
   template repeats over a badge collection that happened to be empty, or whether it is genuinely static
   and empty, **cannot be determined from this dump**. Honest gap.
3. **Text nodes are not individually addressable.** The dump records a `text:` field per *element*
   (concatenation of that element's direct child text nodes) and gives no rect for text nodes. So:
   * I can prove the *name* occupies `150.2 → 224` in row 1 by differencing the img and `<br>` rects, but
     I cannot cite a rect for the e-mail line, nor for the "Discord Username:" value, nor for the note text.
   * I can prove row 0's Name/Email cell contains **no non-whitespace direct text** (no `text:` field at
     all, plus the `<br>` sitting flush against the avatar). I cannot distinguish "empty string" from
     "whitespace-only" — both serialise the same way.
4. **`.muted` and `badge-danger` are dead classes — `badge-danger` is confirmed *inside* P08:**
   `.1.18` and `.1.19` are `span.badge.badge-danger` and their resolved `background-color` is
   **`rgb(119, 119, 119)`** — the plain `.badge` grey. The `-danger` modifier paints nothing extra.
   (`.badge-danger-chat` on `.1.13` **is** live: `rgb(255, 0, 0)`.) `.muted` does **not occur anywhere in
   P08**; its dead status is evidenced outside my range at `r.0.1.1.0.1.3.1.5.0.0.63`, `…5.0.0.66`,
   `…5.0.0.1.3`, where `<label class="muted">` records **no `color` deviation**, hence resolves to the
   COMMON `rgb(51, 51, 51)`.
5. **`fa fa-user-circle` (`.4.0.1.1.1.{2,3}.0.0`) and `fa fa-reload` (`.4.0.1.2.1.8.0.1`) have no
   `::before` record.** Those glyphs do not resolve in the loaded FontAwesome build — a real defect in the
   source app, recorded as evidence, not repaired here.
6. **FontAwesome glyph identities are unrecoverable** — every `::before` serialises as
   `"content":"\"\""`. Use the class names as the source of truth.
7. **The `/ login` vs `/ manual` suffix binding expression is not captured.** `.3.5` carries only
   `ng-hide="user.role==0"` and `class="ng-binding"`; the interpolation source is not in the dump. I
   record the two *rendered* values and mark the expression as unknown rather than guessing a field name.
8. **The "ripple" spans (`.4.0.0.1`, `.4.0.0.1.0`) have zero width** and paint nothing. Their inline
   `width:107px; height:107px; left:-10.6719px; top:-42.5px` is a runtime artefact of a material-ripple
   directive; it is not a layout input in this snapshot and must not be reproduced as a visible box.
9. **`border-collapse` / `border-spacing` / `table-layout` are absent from the captured property set**
   (`DEFAULTS.txt` lists 96 properties; none of the three appear). The 1px `td` border-top not doubling
   against the `th` border-bottom is *consistent with* collapsed borders but is an inference, not evidence.
10. **No CSS custom properties, no flexbox, no grid.** `INFO.txt` records `cssVars: {"root":{},"body":{}}`;
    `DEFAULTS.txt` reports every flex/grid property with **1 distinct value across all 2,156 nodes**.
    Confirmed for my own 528 records: not one of them deviates on a flex or grid property. Layout here is
    CSS-table + inline/inline-block + one `float:left`.
