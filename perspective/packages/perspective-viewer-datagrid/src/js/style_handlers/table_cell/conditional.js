// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — conditional rule evaluation                           ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @param {*} user Raw cell value
 * @param {{op: string, value: *, fg?: string, bg?: string}} rule
 * @returns {boolean}
 */
export function ruleMatches(user, rule) {
    if (!rule || rule.op == null) {
        return false;
    }
    const { op, value } = rule;
    if (user === null || user === undefined) {
        return op === "isNull";
    }
    switch (op) {
        case "==":
            return user == value;
        case "!=":
            return user != value;
        case ">":
            return user > value;
        case ">=":
            return user >= value;
        case "<":
            return user < value;
        case "<=":
            return user <= value;
        case "contains":
            return String(user).includes(String(value));
        case "startsWith":
            return String(user).startsWith(String(value));
        case "isNull":
            return false;
        default:
            return false;
    }
}

/**
 * Apply first matching conditional formatting rule onto a cell element.
 * @param {HTMLElement} td
 * @param {*} user
 * @param {Array} rules
 */
export function applyConditionalFormatting(td, user, rules) {
    if (!rules?.length) {
        return false;
    }
    for (const rule of rules) {
        if (ruleMatches(user, rule)) {
            if (rule.fg) {
                td.style.color = rule.fg;
            }
            if (rule.bg) {
                td.style.backgroundColor = rule.bg;
            }
            td.classList.add("psp-ag-conditional");
            return true;
        }
    }
    return false;
}
