/**
 * @author Massimiliano Izzo
 * @description a method to composed a query on JSON/JSONB metadata stored within 
 *              the XTENS repository (see https://github.com/biolab-unige/xtens-app)
 */
var _ = require("lodash");
var extend = require("./Utils.js").extend;
var PostgresJSONQueryStrategy = require("./PostgresJSONQueryStrategy.js");
var DataTypeClasses = require("./Utils").DataTypeClasses;
var determineTableByModel = require("./Utils.js").determineTableByModel;
var allowedComparators = require("./Utils.js").allowedComparators;
var specializedProperties = require("./Utils.js").specializedProperties;
var pdProperties = require("./Utils.js").pdProperties;

var queryOutput = {
    lastPosition: 0,
    cteCount: 0,
    parameters: []
};

/**
 * @class PostgresJSONBQueryStrategy
 * @extends PostgresJSONQueryStrategy
 * @description strategy method to compose a query against PostgreSQL JSONB data format where metadata are stored
 */
function PostgresJSONBQueryStrategy() {
    
    /**
     * @method
     * @name getSubqueryRow
     * @description compose a (sub)query fragment based a a single criterium (a single paeameter and a condition
     *              over the parameter)
     */     
    this.getSubqueryRow = function(element, previousOutput, tablePrefix) {
        
        if(_.isEmpty(element)) {
            return null;
        }

        if (allowedComparators.indexOf(element.comparator) < 0) {
            console.log(element.comparator);
            throw new Error("Operation not allowed. Trying to inject a forbidden comparator!!");
        }

        var i, subquery = "", subqueries = [], param, operatorPrefix;

        if (element.isList) {
            // if the comparator has a not condition add it a prefix
            operatorPrefix = element.comparator === 'NOT IN' ? 'NOT ' : '';

            subqueries = [];
            for (i=0; i<element.fieldValue.length; i++) {
                param = "\'{\"" + element.fieldName + "\":{\"value\":\"" + element.fieldValue[i] + "\"}}\'";
                subqueries.push(operatorPrefix + tablePrefix + "metadata @> $" + (++previousOutput.lastPosition));
                previousOutput.parameters.push(param);
            }
            subquery = subqueries.join(" AND ");
        }
        
        // if it is an equality matching use JSONB containment (@>) operator 
        else if (element.comparator === '=' || element.comparator === '!=') {

            // if the comparator has an inequality condition add a NOT a prefix
            operatorPrefix = element.comparator === '!=' ? 'NOT ' : '';

            param = "\'{\"" + element.fieldName + "\":{\"value\":\"" + element.fieldValue + "\"}}\'";
            subquery = tablePrefix + "metadata @> $" + (++previousOutput.lastPosition);
            previousOutput.parameters.push(param);
        }

        // otherwise use the standard JSON/JSONB accessor (->/->>) operator
        else {
            subquery = "(" + tablePrefix + "metadata->$" + (++previousOutput.lastPosition) + "->>'value')::" + element.fieldType.toLowerCase()  + 
                " " + element.comparator + " $" + (++previousOutput.lastPosition);
            previousOutput.parameters.push(element.fieldName);
            previousOutput.parameters.push(element.fieldValue);
        }
        
        // add condition on unit if present
        if (element.fieldUnit) {
            param = "\'{\"" + element.fieldName + "\":{\"unit\":\"" + element.fieldUnit + "\"}}\'";
            subquery += " AND ";
            subquery +=  tablePrefix + "metadata @> $" + (++previousOutput.lastPosition);
            previousOutput.parameters.push(param);
        }
        return {subquery: subquery, previousOutput: previousOutput};

    };

}

// The JSONB query stategy extends the basic JSON strategy
extend(PostgresJSONBQueryStrategy,PostgresJSONQueryStrategy);

module.exports = PostgresJSONBQueryStrategy;