// @input Component.ScriptComponent shortstack
// @input string stateToCall = ""  { "label": "Pick A State", "widget":"combobox", "values":[{"label":"none", "value":""}, {"label":"banana", "value":"banana"}, {"label":"blueberry", "value":"blueberry"}, {"label":"chocolate", "value":"chocolate"}]}

//go to state banana on Shortstack
script.shortstack.api.go(script.stateToCall);