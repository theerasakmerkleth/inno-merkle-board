<?php

namespace App\Helpers;

use HTMLPurifier;
use HTMLPurifier_Config;

class Sanitizer
{
    public static function clean($html)
    {
        if (empty($html)) {
            return '';
        }

        $config = HTMLPurifier_Config::createDefault();
        // Allow common tags for TipTap
        $config->set('HTML.Allowed', 'p,b,strong,i,em,u,a[href|title],ul,ol,li,h1,h2,h3,blockquote,code,pre,br');
        $config->set('Attr.AllowedFrameTargets', ['_blank']);
        
        $purifier = new HTMLPurifier($config);
        
        return $purifier->purify($html);
    }
}
