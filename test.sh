#!/bin/bash

declare -A foo
a="baz"
foo[bar]="this is bar"
foo[baz]=""
if [[ -v "foo[bar]" ]] ; then
  echo "foo[bar] is set"
fi
if [[ -v "foo[$a]" ]] ; then
  echo "foo[baz] is set"
fi
if [[ ! -v "foo[$a]" ]] ; then
  echo "foo[quux] is set"
fi
