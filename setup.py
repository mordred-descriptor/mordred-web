from setuptools import setup

setup(
    name='mordred-web',
    version='0.1.0',
    packages=[
        'mordred_web',
    ],
    package_dir={'mordred_web': 'python/mordred_web'},

    install_requires=[
        'mordred>=0.2.1',
        'tornado>=4.4.2',
        'psutil>=5.0.1',
    ],

    author='Hirotomo Moriwaki',
    author_email='philopon.dependence@gmail.com',
    license='BSD3',
)
