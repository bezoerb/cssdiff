var _ = require('lodash'),
    hash = require('es-hash'),
    css = require('css');


/**
 * Build prefix
 * @param rule
 * @returns {string}
 */
function getPrefix(rule) {

    var prefixes = [];


    if (rule.parent) {
        var parentPrefix = getPrefix(rule.parent);

        if (parentPrefix) {
            prefixes.push(parentPrefix);
        }
    }

    if (rule.type !== 'rule') {
        prefixes.push(rule.type);
    }

    if (rule.hasOwnProperty(rule.type) && _.isString(rule[rule.type])) {
        prefixes.push(rule[rule.type]);
    }

    var result = prefixes.join('-');

    if (rule.type === 'rule') {
        result += ' '
    }

    return result;
}

/**
 * Generate function that returns declarations for selector which are not in the compare stylesheet
 *
 * @param compare
 * @returns {Function}
 */
function getDeclarationDiffFunction(compare) {
    return function(selector,declarations) {
        if (!compare.hasOwnProperty(selector)) {
            return declarations;
        }

        // return all declarations which are not inside compare
        return _.chain(declarations)
            .filter(function(declaration){
                return !compare[selector].hasOwnProperty(declaration.property) ||
                    compare[selector][declaration.property] !==  declaration.value;
            }).value();
    }
}

function getGroupedDeclarationDiffFunction(compareFunc) {
    return function (rule) {
        var prefix = getPrefix(rule);
        var tmp = _.chain(rule.selectors).reduce(function(result,selector){
            var declarations = compareFunc(prefix+selector,rule.declarations);
            result.push({
                selector: selector,
                declarations: declarations,
                hash: hash(_.clone(declarations))
            });
            return result;
        },[]).filter(function(entry) {
            return !!entry.declarations.length
        }).groupBy(function(entry){
            return entry.hash;
        }).reduce(function(result,group) {
            result.push({
                declarations: _.first(group).declarations,
                selectors: _.reduce(group,function(result,entry){
                    result.push(entry.selector);
                    return result;
                },[])
            });
            return result;
        },[]).value();

        return tmp;
    }
}


function buildCompare(rules) {
    return _.chain(rules)
        .filter(function (rule) {
            return rule.type && rule.type === 'rule';
        })
        .reduce(function(result, rule) {
            var prefix = getPrefix(rule);
            var declarations = _.chain(rule.declarations)
                .filter(function(declaration) {
                    return declaration.type === 'declaration';
                })
                .reduce(function(result, declaration) {
                    result[declaration.property] = declaration.value;
                    return result;
                },{})
                .value();

            _.forEach(rule.selectors,function(selector){
                result[prefix+selector] = _.assign(result[prefix+selector] || {}, declarations);;
            });

            return result;
        },{}).value();
}


/**
 * compare multiple stylesheet strings and generate diff.
 * Diff consists of all css rules in first stylesheet which do not exist in any other stylesheet
 */
function cssdiff() {

    var args = Array.prototype.slice.call(arguments);
        mainCss = args.shift();

    // return main css if there is nothing to compare with
    if (!args.length) {
        return mainCss;
    }

    var main = css.parse(mainCss);
    var compare = css.parse(args.shift());


    var compareSelectors = buildCompare(compare.stylesheet.rules);




    var compareSelectorKeys = _.keys(compareSelectors);
    var getGroupedDiffDeclarations = getGroupedDeclarationDiffFunction(getDeclarationDiffFunction(compareSelectors));

    main.stylesheet.rules = _.chain(main.stylesheet.rules)
        .reduce(function (result, rule) {
            // intersect with empty array when there is no selector e.g. for rule.type === 'comment'

            var prefix = getPrefix(rule);
            var selectors = _.map(rule.selectors || [],function(selector){
                return prefix + selector;
            });
            var intersection = _.intersection(compareSelectorKeys, selectors);

            // no intersection between main stylesheet and compare stylesheet
            if (rule.type !== 'rule' || !intersection.length) {
                result.push(rule);

            // intersections found
            } else {
                var groupedDiffDeclarations = getGroupedDiffDeclarations(rule);

                _.forEach(groupedDiffDeclarations,function(group){
                    var clone = _.cloneDeep(rule);
                    clone.selectors = group.selectors;
                    clone.declarations = group.declarations;
                    result.push(clone)
                });
            }

            return result;
        },[])
        .uniq()
        .value();


    return css.stringify(main);
}


module.exports = cssdiff;
