dojo.provide('modules.Fib');

modules.Fib.fibonacci = function(x) {
	
	if(x < 0) {
		throw Exception('Illegal argument exception.');
	}
	
	if(x <= 1) {
		return x;
	}
	return modules.Fib.fibonacci(x - 1) + modules.Fib.fibonacci(x - 2);
}